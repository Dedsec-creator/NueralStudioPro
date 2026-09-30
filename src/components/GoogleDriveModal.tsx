import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  Music,
  Mic,
  Search,
  RefreshCw,
  Download,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  LogOut,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
  subscribeToAuthState,
} from '../services/googleDriveAuth';
import {
  listDriveAudioItems,
  downloadDriveAudioFile,
  formatDriveFileSize,
  DriveItem,
  DriveFolderBreadcrumb,
} from '../services/googleDriveService';
import { launchGooglePicker } from '../services/googlePickerService';
import { audioEngine } from '../audio/audioEngine';
import { User } from 'firebase/auth';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetTrack?: 'vocal' | 'beat' | 'library';
  onStemLoaded?: (trackType: 'vocal' | 'beat', fileName: string) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  initialTargetTrack = 'beat',
  onStemLoaded,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [targetTrack, setTargetTrack] = useState<'vocal' | 'beat' | 'library'>(initialTargetTrack);

  const [items, setItems] = useState<DriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<DriveFolderBreadcrumb[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Download / Placement state
  const [activeDownloadingId, setActiveDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusText, setDownloadStatusText] = useState<string>('');
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);

  // Audio Preview player state
  const [previewingFileId, setPreviewingFileId] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);

  // Sync target track if modal opens with different initial track
  useEffect(() => {
    if (isOpen) {
      setTargetTrack(initialTargetTrack);
    }
  }, [isOpen, initialTargetTrack]);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsub = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      const curToken = getAccessToken();
      setToken(curToken);
      if (currentUser && curToken && isOpen) {
        loadFolderItems('root');
      }
    });
    return () => unsub();
  }, [isOpen]);

  // Clean up audio preview when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
  }, [isOpen]);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
    setPreviewingFileId(null);
    setIsPreviewLoading(false);
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogle();
      setUser(res.user);
      setToken(res.accessToken);
      await loadFolderItems('root', undefined, res.accessToken);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in cancelled. Please authorize Google Drive to continue.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    stopPreview();
    try {
      await signOutGoogle();
      setUser(null);
      setToken(null);
      setItems([]);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error signing out');
    }
  };

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const loadFolderItems = async (
    folderId: string = currentFolderId,
    search?: string,
    overrideToken?: string
  ) => {
    const activeToken = overrideToken || token || getAccessToken();
    if (!activeToken) return;

    setIsLoadingList(true);
    setErrorMsg(null);
    stopPreview();

    try {
      const files = await listDriveAudioItems(activeToken, {
        folderId,
        searchTerm: search !== undefined ? search : searchTerm,
      });
      setItems(files);
    } catch (err: any) {
      if (err.message === 'AUTH_EXPIRED') {
        setErrorMsg('Google Drive session expired. Please sign in again.');
        setUser(null);
        setToken(null);
      } else {
        setErrorMsg(err.message || 'Failed to list Google Drive files');
      }
    } finally {
      setIsLoadingList(false);
    }
  };

  const navigateToFolder = (folder: DriveItem) => {
    setSearchTerm('');
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadFolderItems(folder.id, '');
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearchTerm('');
    loadFolderItems(target.id, '');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFolderItems(currentFolderId, searchTerm);
  };

  // Quick preview audio in modal
  const handleTogglePreview = async (item: DriveItem) => {
    if (previewingFileId === item.id) {
      stopPreview();
      return;
    }

    stopPreview();
    const activeToken = token || getAccessToken();
    if (!activeToken) return;

    setPreviewingFileId(item.id);
    setIsPreviewLoading(true);

    try {
      const blob = await downloadDriveAudioFile(activeToken, item.id);
      const url = URL.createObjectURL(blob);
      previewBlobUrlRef.current = url;

      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
        previewAudioRef.current.onended = () => {
          setPreviewingFileId(null);
        };
      }

      previewAudioRef.current.src = url;
      await previewAudioRef.current.play();
    } catch (err) {
      console.warn('Audio preview failed:', err);
      stopPreview();
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Place Audio into NeuralTune Engine (Vocals, Beat, or Library)
  const handlePlaceAudio = async (item: DriveItem, trackOverride?: 'vocal' | 'beat' | 'library') => {
    const target = trackOverride || targetTrack;
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setErrorMsg('Please sign in to Google Drive first.');
      return;
    }

    stopPreview();
    setActiveDownloadingId(item.id);
    setDownloadProgress(0);
    setDownloadStatusText('Downloading from Google Drive...');

    try {
      const blob = await downloadDriveAudioFile(activeToken, item.id, (pct) => {
        setDownloadProgress(pct);
      });

      setDownloadStatusText('Decoding audio waveform & preparing stems...');

      const file = new File([blob], item.name, {
        type: item.mimeType || 'audio/wav',
        lastModified: Date.now(),
      });

      if (target === 'vocal') {
        const ok = await audioEngine.loadVocalFile(file);
        if (ok) {
          onStemLoaded?.('vocal', item.name);
          onClose();
        } else {
          setErrorMsg('Could not decode vocal stem. Please ensure audio file is valid.');
        }
      } else if (target === 'beat') {
        const ok = await audioEngine.loadBeatFile(file);
        if (ok) {
          onStemLoaded?.('beat', item.name);
          onClose();
        } else {
          setErrorMsg('Could not decode beat stem. Please ensure audio file is valid.');
        }
      } else {
        // Import to Library directly
        const ok = await audioEngine.loadVocalFile(file);
        if (ok) {
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'AUTH_EXPIRED') {
        setErrorMsg('Google session expired. Please sign in again.');
      } else {
        setErrorMsg(err.message || 'Failed to download and import audio track.');
      }
    } finally {
      setActiveDownloadingId(null);
      setDownloadProgress(0);
      setDownloadStatusText('');
    }
  };

  // Launch official Google Picker dialog
  const handleOpenGooglePicker = async () => {
    stopPreview();
    setErrorMsg(null);
    setIsOpeningPicker(true);
    setDownloadStatusText('Opening Google Picker...');

    try {
      await launchGooglePicker({
        accessToken: token || getAccessToken() || undefined,
        targetTrack,
        title: `Select ${targetTrack === 'vocal' ? 'Vocal Track' : 'Beat Track'} - NeuralTune Studio`,
        onProgress: (pct, text) => {
          if (text) {
            setDownloadStatusText(text);
            setDownloadProgress(pct);
            setActiveDownloadingId('google-picker-download');
          }
        },
        onStemLoaded: (track, fileName) => {
          onStemLoaded?.(track as 'vocal' | 'beat', fileName);
          onClose();
        },
        onError: (err) => {
          setErrorMsg(err.message || 'Google Picker encountered an error.');
        },
      });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Could not launch Google Picker.');
      }
    } finally {
      setIsOpeningPicker(false);
      setActiveDownloadingId(null);
      setDownloadProgress(0);
      setDownloadStatusText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-google-drive-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !activeDownloadingId) {
          onClose();
        }
      }}
    >
      <div
        id="modal-google-drive-container"
        className="w-full max-w-3xl bg-[#0c121e] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 via-emerald-500/20 to-amber-500/20 border border-blue-500/30 flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z"
                  fill="#4285F4"
                />
                <path
                  d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z"
                  fill="#0F9D58"
                />
                <path
                  d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z"
                  fill="#FFBA00"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  Google Drive Audio Hub
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Cloud Stems
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Directly browse and place beat instrumentals and vocal recordings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-slate-300 max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="ml-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  title="Sign out from Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              id="btn-close-google-drive-modal"
              onClick={onClose}
              disabled={Boolean(activeDownloadingId)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TARGET TRACK SELECTOR BAR */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300">Place Audio Into:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-target-track-vocal"
              onClick={() => setTargetTrack('vocal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-xs ${
                targetTrack === 'vocal'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Track 1: Vocals</span>
            </button>

            <button
              id="btn-target-track-beat"
              onClick={() => setTargetTrack('beat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-xs ${
                targetTrack === 'beat'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Track 2: Beat</span>
            </button>

            <button
              id="btn-target-track-library"
              onClick={() => setTargetTrack('library')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer text-xs ${
                targetTrack === 'library'
                  ? 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Library</span>
            </button>
          </div>

          {/* Quick Launch Google Picker Action */}
          <div className="flex items-center gap-2">
            <button
              id="btn-launch-google-picker-top"
              onClick={handleOpenGooglePicker}
              disabled={isOpeningPicker || Boolean(activeDownloadingId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-cyan-500/10 transition cursor-pointer active:scale-95 disabled:opacity-60"
              title="Launch official Google Picker to select audio files directly from Google Drive"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
              </svg>
              <span>{isOpeningPicker ? 'Opening Picker...' : 'Open Google Picker'}</span>
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMsg && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ACTIVE DOWNLOAD / DECODE PROGRESS BANNER */}
        {activeDownloadingId && (
          <div className="p-4 mx-4 mt-3 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 text-cyan-200 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400 animate-bounce" />
                {downloadStatusText}
              </span>
              <span className="font-mono text-cyan-300">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-400 h-full transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* BODY: SIGN-IN STATE VS FILE EXPLORER */}
        {!user || !token ? (
          /* NOT SIGNED IN */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-xl">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z"
                  fill="#4285F4"
                />
                <path
                  d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z"
                  fill="#0F9D58"
                />
                <path
                  d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z"
                  fill="#FFBA00"
                />
              </svg>
            </div>

            <h4 className="text-lg font-bold text-white mb-1.5">
              Connect Your Google Drive
            </h4>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Access your saved audio files, instrumental beats, and vocal takes directly inside the studio.
              No need to switch to external apps or native file pickers that cause browser reloads.
            </p>

            {/* Action Buttons: Sign In or Launch Google Picker directly */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
              <button
                id="btn-launch-google-picker-unauth"
                onClick={handleOpenGooglePicker}
                disabled={isOpeningPicker}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer active:scale-95 disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#ffffff" />
                  <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#ffffff" fillOpacity="0.85" />
                  <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#ffffff" fillOpacity="0.7" />
                </svg>
                <span>{isOpeningPicker ? 'Connecting & Opening...' : 'Launch Google Picker'}</span>
              </button>

              {/* Official Sign in with Google Button */}
              <button
                id="btn-google-drive-signin"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm transition cursor-pointer shadow-lg active:scale-95 disabled:opacity-60 border border-slate-200"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Read-only audio access
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Stays in background
              </span>
            </div>
          </div>
        ) : (
          /* SIGNED IN: EXPLORER */
          <div className="flex-1 flex flex-col min-h-0">
            {/* FOLDER BREADCRUMBS & SEARCH */}
            <div className="p-3 sm:p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1 text-xs overflow-x-auto py-1 min-w-0">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                    <button
                      onClick={() => navigateToBreadcrumb(idx)}
                      className={`px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer shrink-0 ${
                        idx === breadcrumbs.length - 1
                          ? 'font-bold text-white bg-slate-800/60'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {idx === 0 ? '📁 ' + crumb.name : crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2 shrink-0">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-60">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search beats, vocals..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        loadFolderItems(currentFolderId, '');
                      }}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </form>

                <button
                  onClick={() => loadFolderItems()}
                  disabled={isLoadingList}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-800 disabled:opacity-50"
                  title="Refresh folder"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleOpenGooglePicker}
                  disabled={isOpeningPicker || Boolean(activeDownloadingId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow transition cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Open official Google Picker dialog"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#ffffff" />
                    <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#ffffff" fillOpacity="0.85" />
                    <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#ffffff" fillOpacity="0.7" />
                  </svg>
                  <span className="hidden sm:inline">Google Picker</span>
                </button>
              </div>
            </div>

            {/* FILE & FOLDER LIST */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 min-h-[280px] max-h-[460px]">
              {isLoadingList ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mb-2" />
                  <p className="text-xs text-slate-400">Loading Google Drive items...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
                    <Music className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No Audio Files Found</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    {searchTerm
                      ? `No audio files matched "${searchTerm}". Try a different name.`
                      : 'This folder does not contain WAV, MP3, or FLAC audio files.'}
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const isDownloading = activeDownloadingId === item.id;
                  const isPreviewing = previewingFileId === item.id;

                  if (item.isFolder) {
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigateToFolder(item)}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-500/20">
                            <Folder className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-300 text-xs">
                          <span>Open</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  }

                  // Audio File Item
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all gap-2 ${
                        isDownloading
                          ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/40'
                          : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Format Icon */}
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                          <Music className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className="text-xs font-bold text-slate-200 hover:text-white truncate"
                              title={item.name}
                            >
                              {item.name}
                            </p>
                            {item.fileExtension && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                                {item.fileExtension}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span>{formatDriveFileSize(item.size)}</span>
                            {item.modifiedTime && (
                              <span>
                                {new Date(item.modifiedTime).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Preview & Place */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {/* Audio Preview Button */}
                        <button
                          onClick={() => handleTogglePreview(item)}
                          disabled={Boolean(activeDownloadingId)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                            isPreviewing
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold animate-pulse'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                          title={isPreviewing ? 'Stop preview' : 'Listen to preview'}
                        >
                          {isPreviewLoading && isPreviewing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isPreviewing ? (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span className="hidden xs:inline">
                            {isPreviewing ? 'Stop' : 'Preview'}
                          </span>
                        </button>

                        {/* Quick Placement Buttons */}
                        <button
                          onClick={() => handlePlaceAudio(item, 'vocal')}
                          disabled={Boolean(activeDownloadingId)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Place as Vocal Stem (Track 1)"
                        >
                          <Mic className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Vocals</span>
                        </button>

                        <button
                          onClick={() => handlePlaceAudio(item, 'beat')}
                          disabled={Boolean(activeDownloadingId)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Place as Beat Stem (Track 2)"
                        >
                          <Music className="w-3.5 h-3.5 text-amber-400" />
                          <span>Beat</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] text-slate-400">
              {user ? 'Google Drive Synced' : 'Ready to Connect'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
