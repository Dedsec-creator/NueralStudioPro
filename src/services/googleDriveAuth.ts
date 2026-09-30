import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

// Google Auth Provider configured with Google Picker & Drive scopes
export const driveProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => driveProvider.addScope(scope));
driveProvider.setCustomParameters({
  prompt: 'select_account',
});

// Strictly in-memory token cache for Google Workspace API calls (Never in localStorage or sessionStorage)
let currentAccessToken: string | null = null;
let currentGisUser: User | null = null;
let authSubscribers: Array<(user: User | null) => void> = [];

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function getCurrentUser(): User | null {
  return currentGisUser || auth.currentUser;
}

export interface GoogleAuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Loads the Google Identity Services client script if not already present.
 */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser only'));
    if (window.google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

/**
 * Direct OAuth 2.0 Token Client via Google Identity Services (GIS).
 * Runs seamlessly in iframe environments where Firebase Auth popup handler may encounter network or storage restrictions.
 */
export async function requestTokenViaGis(): Promise<{ user: User; accessToken: string }> {
  await loadGisScript();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services client unavailable.'));
    }

    const clientId = firebaseConfig.oAuthClientId;
    if (!clientId) {
      return reject(new Error('OAuth Client ID not found in configuration.'));
    }

    let isResolved = false;

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: WORKSPACE_SCOPES.join(' '),
      prompt: 'consent',
      callback: async (response: any) => {
        if (isResolved) return;
        isResolved = true;

        if (response.error) {
          if (response.error === 'popup_closed_by_user' || response.error_subtype === 'access_denied') {
            const cancelError: any = new Error('Sign-in cancelled by user.');
            cancelError.code = 'auth/popup-closed-by-user';
            return reject(cancelError);
          }
          return reject(new Error(response.error_description || response.error || 'Authentication failed'));
        }

        const accessToken = response.access_token;
        if (!accessToken) {
          return reject(new Error('No access token received from Google.'));
        }

        setAccessToken(accessToken);

        // Retrieve user info using the fresh token
        let userInfo: any = null;
        try {
          const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (infoRes.ok) {
            userInfo = await infoRes.json();
          }
        } catch (e) {
          console.warn('Could not fetch user profile info:', e);
        }

        const syntheticUser = {
          uid: userInfo?.sub || 'google-workspace-user',
          displayName: userInfo?.name || userInfo?.email?.split('@')[0] || 'Google User',
          email: userInfo?.email || null,
          photoURL: userInfo?.picture || null,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => accessToken,
          getIdTokenResult: async () => ({ token: accessToken } as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          providerId: 'google.com',
        } as unknown as User;

        currentGisUser = syntheticUser;
        authSubscribers.forEach((cb) => cb(syntheticUser));
        resolve({ user: syntheticUser, accessToken });
      },
      error_callback: (err: any) => {
        if (isResolved) return;
        isResolved = true;
        const cancelError: any = new Error(err?.message || 'Sign-in cancelled or popup closed.');
        cancelError.code = 'auth/popup-closed-by-user';
        reject(cancelError);
      },
    });

    tokenClient.requestAccessToken();
  });
}

/**
 * Sign in to obtain Google Workspace access token.
 * Uses Firebase Auth with automatic GIS fallback for robust operation across all browser and iframe sandbox contexts.
 */
export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('No access token received from Firebase Google authentication.');
    }

    setAccessToken(token);
    currentGisUser = null;
    return { user: result.user, accessToken: token };
  } catch (err: any) {
    // Check if error is network/popup/cross-origin related
    const isNetworkOrPopupError =
      err.code === 'auth/network-request-failed' ||
      err.code === 'auth/internal-error' ||
      err.code === 'auth/unauthorized-domain' ||
      err.code === 'auth/operation-not-supported-in-this-environment' ||
      err.code === 'auth/cancelled-popup-request';

    if (isNetworkOrPopupError) {
      console.warn('Firebase Auth popup hit network/environment barrier. Falling back to Google Identity Services (GIS)...', err);
      try {
        return await requestTokenViaGis();
      } catch (gisErr: any) {
        console.error('GIS token request error:', gisErr);
        throw gisErr;
      }
    }

    console.error('Google Drive sign-in error:', err);
    throw err;
  }
}

/**
 * Sign out from Google Auth and clear cached tokens.
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase sign-out note:', err);
  }
  setAccessToken(null);
  currentGisUser = null;
  authSubscribers.forEach((cb) => cb(null));
}

/**
 * Listen for user auth state changes.
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  authSubscribers.push(callback);

  if (currentGisUser) {
    callback(currentGisUser);
  } else if (auth.currentUser) {
    callback(auth.currentUser);
  }

  const unsubscribeFirebase = onAuthStateChanged(auth, (user) => {
    if (user) {
      currentGisUser = null;
      callback(user);
    } else if (!currentGisUser) {
      setAccessToken(null);
      callback(null);
    }
  });

  return () => {
    authSubscribers = authSubscribers.filter((cb) => cb !== callback);
    unsubscribeFirebase();
  };
}
