/**
 * Google Drive API v3 Service
 * Handles querying, browsing folders, and streaming/downloading audio files for NeuralTune Ultra.
 */

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  iconLink?: string;
  isFolder: boolean;
  fileExtension?: string;
}

export interface DriveFolderBreadcrumb {
  id: string;
  name: string;
}

/**
 * Format bytes to human readable string (e.g. 14.2 MB)
 */
export function formatDriveFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '--';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Identify if a file is an audio stem based on mimeType or file extension.
 */
export function isAudioFile(name: string, mimeType: string): boolean {
  if (mimeType.startsWith('audio/')) return true;
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.wav') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.aac') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.aiff') ||
    lower.endsWith('.aif') ||
    lower.endsWith('.webm')
  );
}

/**
 * List files and subfolders in a specific folder, or search globally.
 */
export async function listDriveAudioItems(
  accessToken: string,
  options: {
    folderId?: string;
    searchTerm?: string;
    pageSize?: number;
  } = {}
): Promise<DriveItem[]> {
  const { folderId = 'root', searchTerm, pageSize = 50 } = options;

  let query: string;

  if (searchTerm && searchTerm.trim().length > 0) {
    const escapedTerm = searchTerm.replace(/'/g, "\\'");
    query = `trashed = false and name contains '${escapedTerm}' and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/' or name contains '.wav' or name contains '.mp3' or name contains '.flac' or name contains '.m4a' or name contains '.ogg' or name contains '.aac')`;
  } else {
    query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/' or name contains '.wav' or name contains '.mp3' or name contains '.flac' or name contains '.m4a' or name contains '.ogg' or name contains '.aac')`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('fields', 'files(id, name, mimeType, size, modifiedTime, iconLink)');
  url.searchParams.set('orderBy', 'folder desc, name asc');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_EXPIRED');
    }
    const errText = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawFiles: any[] = data.files || [];

  return rawFiles.map((file): DriveItem => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const ext = !isFolder && file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : undefined;
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size, 10) : undefined,
      modifiedTime: file.modifiedTime,
      iconLink: file.iconLink,
      isFolder,
      fileExtension: ext,
    };
  });
}

/**
 * Downloads a Google Drive audio file as a Blob.
 */
export async function downloadDriveAudioFile(
  accessToken: string,
  fileId: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_EXPIRED');
    }
    throw new Error(`Failed to download audio file (${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || !total || !onProgress) {
    onProgress?.(100);
    return await response.blob();
  }

  // Stream reader with progress calculation
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      const pct = Math.min(99, Math.round((received / total) * 100));
      onProgress(pct);
    }
  }

  onProgress(100);
  const totalArray = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    totalArray.set(chunk, offset);
    offset += chunk.length;
  }

  const mimeType = response.headers.get('content-type') || 'audio/wav';
  return new Blob([totalArray], { type: mimeType });
}
