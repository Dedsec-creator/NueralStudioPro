import { showToast } from './toast';
import { encodeAudioBufferToBlob } from '../audio/exportEncoder';
import { ExportQualityId } from '../types';

/**
 * Universal safe browser file download utility for desktop & mobile (Android / iOS).
 * Resolves browser-specific download cancellations:
 * 1. Appends anchor element to DOM before clicking (required for Firefox, Android Chrome, and Safari).
 * 2. Avoids synchronous URL.revokeObjectURL which prematurely cancels ongoing download streams on mobile.
 * 3. Sanitizes filenames and validates Blob instances.
 * 4. Provides clear feedback toast to user.
 */

// Keep track of active download URLs to prevent garbage collection before download stream finishes
const activeDownloadUrls = new Set<string>();

export function downloadBlob(blob: Blob, filename: string, showToastFeedback: boolean = true): boolean {
  if (!blob || !(blob instanceof Blob)) {
    console.error('[DownloadHelper] Invalid Blob provided for download:', blob);
    showToast('Download failed: Invalid audio file data.', 'error');
    return false;
  }

  // Clean filename for mobile/desktop filesystem compatibility
  let cleanFilename = filename.replace(/[<>:"/\\|?*]+/g, '_').trim();
  if (!cleanFilename) {
    cleanFilename = `master_audio_${Date.now()}.wav`;
  } else if (!cleanFilename.includes('.')) {
    if (blob.type.includes('mpeg') || blob.type.includes('mp3')) {
      cleanFilename += '.mp3';
    } else if (blob.type.includes('json')) {
      cleanFilename += '.json';
    } else {
      cleanFilename += '.wav';
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    activeDownloadUrls.add(url);

    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = url;
    anchor.download = cleanFilename;
    anchor.setAttribute('download', cleanFilename);
    anchor.setAttribute('rel', 'noopener noreferrer');
    anchor.setAttribute('target', '_self');

    document.body.appendChild(anchor);
    anchor.click();

    // Clean up DOM anchor in next tick
    setTimeout(() => {
      try {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
      } catch (_) {}
    }, 150);

    // Keep Object URL valid for 60 seconds so browser download manager on mobile or desktop
    // completes streaming the file without net::ERR_FILE_NOT_FOUND or silent cancellation
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
        activeDownloadUrls.delete(url);
      } catch (_) {}
    }, 60000);

    if (showToastFeedback) {
      showToast(`Downloading "${cleanFilename}"...`, 'success');
    }
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DownloadHelper] Error triggering download:', err);
    showToast(`Download failed: ${msg}`, 'error');
    return false;
  }
}

export function downloadAudioBuffer(
  buffer: AudioBuffer,
  filename: string,
  quality: ExportQualityId = 'wav_24bit',
  showToastFeedback: boolean = true
): boolean {
  try {
    const { blob, extension } = encodeAudioBufferToBlob(buffer, quality);
    const finalName = filename.endsWith(extension) ? filename : `${filename}${extension}`;
    return downloadBlob(blob, finalName, showToastFeedback);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DownloadHelper] Error encoding and downloading audio buffer:', err);
    showToast(`Export failed: ${msg}`, 'error');
    return false;
  }
}

export function downloadJson(
  data: unknown,
  filename: string,
  showToastFeedback: boolean = true
): boolean {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    return downloadBlob(blob, cleanFilename, showToastFeedback);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DownloadHelper] Error downloading JSON:', err);
    showToast(`Export backup failed: ${msg}`, 'error');
    return false;
  }
}
