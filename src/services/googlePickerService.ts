/**
 * Google Picker API Integration Service
 * Follows Google Workspace Integration specifications for AI Studio client environments.
 */

import { getAccessToken, signInWithGoogle } from './googleDriveAuth';
import { downloadDriveAudioFile } from './googleDriveService';
import { audioEngine } from '../audio/audioEngine';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export interface PickedAudioDoc {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url?: string;
  iconUrl?: string;
}

export interface OpenGooglePickerOptions {
  accessToken?: string;
  title?: string;
  targetTrack?: 'vocal' | 'beat' | 'library';
  onStemLoaded?: (trackType: 'vocal' | 'beat' | 'library', fileName: string) => void;
  onProgress?: (percent: number, statusText: string) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

let pickerApiLoadPromise: Promise<void> | null = null;

/**
 * Loads the Google API client script and initializes the Google Picker module.
 */
export function loadGooglePickerApi(): Promise<void> {
  if (pickerApiLoadPromise) {
    return pickerApiLoadPromise;
  }

  pickerApiLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Picker is only available in the browser.'));
      return;
    }

    // Check if google.picker is already ready
    if (window.google?.picker?.PickerBuilder) {
      resolve();
      return;
    }

    const initPicker = () => {
      if (!window.gapi) {
        reject(new Error('Failed to load Google API (gapi) library.'));
        return;
      }
      window.gapi.load('picker', {
        callback: () => {
          if (window.google?.picker?.PickerBuilder) {
            resolve();
          } else {
            reject(new Error('Google Picker library did not initialize properly.'));
          }
        },
        onerror: () => {
          reject(new Error('Network error loading Google Picker module.'));
        },
        timeout: 15000,
        ontimeout: () => {
          reject(new Error('Google Picker library load timed out.'));
        },
      });
    };

    // If gapi is already on page, load picker module directly
    if (window.gapi) {
      initPicker();
      return;
    }

    // Otherwise dynamically inject the gapi script
    const existingScript = document.querySelector('script[src*="apis.google.com/js/api.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => initPicker());
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load Google API script tag.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => initPicker();
    script.onerror = () => reject(new Error('Failed to load Google API script from apis.google.com.'));
    document.head.appendChild(script);
  });

  return pickerApiLoadPromise;
}

/**
 * Launches the native Google Picker UI dialog.
 * Automatically ensures user authentication and token presence.
 */
export async function launchGooglePicker(options: OpenGooglePickerOptions = {}): Promise<void> {
  const {
    title = 'Select Audio Stem for NeuralTune Ultra',
    targetTrack = 'beat',
    onStemLoaded,
    onProgress,
    onCancel,
    onError,
  } = options;

  try {
    // 1. Ensure active OAuth access token with drive.file / drive.metadata.readonly scopes
    let activeToken = options.accessToken || getAccessToken();
    if (!activeToken) {
      onProgress?.(10, 'Authenticating with Google Drive...');
      try {
        const authResult = await signInWithGoogle();
        activeToken = authResult.accessToken;
      } catch (authErr: any) {
        if (authErr?.code === 'auth/popup-closed-by-user') {
          onCancel?.();
          return;
        }
        throw new Error(
          authErr?.message || 'Google Drive authentication could not be completed in this browser sandbox. Please import audio stems directly from your device.'
        );
      }
    }

    if (!activeToken) {
      throw new Error('Google authentication required to open Google Picker.');
    }

    // 2. Ensure Google Picker client library is loaded
    onProgress?.(30, 'Loading Google Picker interface...');
    await loadGooglePickerApi();

    if (!window.google?.picker?.PickerBuilder) {
      throw new Error('Google Picker is not available.');
    }

    // 3. Determine the correct iframe origin per Google Workspace guidelines
    const pickerOrigin =
      window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    // 4. Build Picker with ViewId.DOCS and Audio Stems filter
    const google = window.google;

    // Create a DocsView specifically configured to highlight audio files and folders
    const audioDocsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMimeTypes('audio/wav,audio/x-wav,audio/mp3,audio/mpeg,audio/flac,audio/x-flac,audio/aac,audio/m4a,audio/x-m4a,audio/ogg,audio/webm,audio/aiff,application/octet-stream');

    // General Docs view so user can browse any folder
    const allDocsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    const pickerCallback = async (data: any) => {
      if (data.action === google.picker.Action.CANCEL) {
        onCancel?.();
        return;
      }

      if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs?.[0] as PickedAudioDoc | undefined;
        if (!doc) return;

        try {
          onProgress?.(10, `Connecting to file "${doc.name}"...`);

          // Download the picked file using Google Drive API
          const blob = await downloadDriveAudioFile(activeToken!, doc.id, (pct) => {
            onProgress?.(pct, `Downloading "${doc.name}" from Google Drive (${pct}%)...`);
          });

          onProgress?.(95, `Decoding audio waveform & loading into ${targetTrack.toUpperCase()}...`);

          const file = new File([blob], doc.name, {
            type: doc.mimeType || 'audio/wav',
            lastModified: Date.now(),
          });

          let loadSuccess = false;
          if (targetTrack === 'vocal') {
            loadSuccess = await audioEngine.loadVocalFile(file);
          } else if (targetTrack === 'beat') {
            loadSuccess = await audioEngine.loadBeatFile(file);
          } else {
            // Library import / vocal fallback
            loadSuccess = await audioEngine.loadVocalFile(file);
          }

          if (loadSuccess) {
            onProgress?.(100, `Successfully loaded "${doc.name}"!`);
            onStemLoaded?.(targetTrack, doc.name);
          } else {
            throw new Error(`Could not decode "${doc.name}". Please ensure file is valid audio.`);
          }
        } catch (err: any) {
          console.error('Error importing picked Google Drive file:', err);
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    const builder = new google.picker.PickerBuilder()
      .addView(audioDocsView)
      .addView(allDocsView)
      .addView(google.picker.ViewId.DOCS)
      .setOAuthToken(activeToken)
      .setOrigin(pickerOrigin)
      .setTitle(title)
      .setCallback(pickerCallback);

    try {
      if (google.picker.DocsUploadView) {
        builder.addView(new google.picker.DocsUploadView());
      }
    } catch (_) {}

    const picker = builder.build();
    picker.setVisible(true);
    onProgress?.(100, '');
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('cancelled')) {
      onCancel?.();
      return;
    }
    console.error('Failed to launch Google Picker:', err);
    onError?.(err instanceof Error ? err : new Error(err.message || 'Failed to open Google Picker.'));
    throw err;
  }
}
