/**
 * Resilient audio decoder that safely handles:
 * 1. Standard audio formats (WAV, MP3, AAC, FLAC, OGG, WebM)
 * 2. Non-standard headers (ID3v2 tags on WAV/MP3, leading metadata/junk bytes)
 * 3. Direct PCM WAV chunk parser fallback if browser decodeAudioData rejects non-standard chunks
 * 
 * Never returns synthetic robot audio when decoding fails.
 */

// Helper to decode using Web Audio API supporting both Promise and callback APIs
async function decodeWithAudioContext(ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer | null> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (_) {}
  }

  return new Promise((resolve) => {
    let isSettled = false;
    const onSuccess = (buf: AudioBuffer) => {
      if (!isSettled) {
        isSettled = true;
        resolve(buf);
      }
    };
    const onError = () => {
      if (!isSettled) {
        isSettled = true;
        resolve(null);
      }
    };

    try {
      // slice(0) prevents detaching the original buffer
      const promise = ctx.decodeAudioData(buffer.slice(0), onSuccess, onError);
      if (promise && typeof (promise as any).then === 'function') {
        (promise as Promise<AudioBuffer>).then(onSuccess).catch(onError);
      }
    } catch {
      onError();
    }
  });
}

/**
 * Direct PCM WAV parser fallback for broadcast WAV, non-standard RIFF, or files with metadata chunks
 * (like BEXT, Cart, Cue, or ID3) that cause browser decodeAudioData to reject.
 */
function parsePcmWavFallback(ctx: AudioContext, buffer: ArrayBuffer): AudioBuffer | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 44) return null;

    // Check 'RIFF' or 'RIFX'
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== 'RIFF' && riff !== 'RIFX') return null;

    // Check 'WAVE'
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== 'WAVE') return null;

    let offset = 12;
    let audioFormat = 1;
    let numChannels = 2;
    let sampleRate = 44100;
    let bitsPerSample = 16;
    let dataOffset = 0;
    let dataLength = 0;

    // Iterate through chunks looking for 'fmt ' and 'data'
    while (offset + 8 <= view.byteLength) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        audioFormat = view.getUint16(offset + 8, true);
        numChannels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataLength = Math.min(chunkSize, view.byteLength - dataOffset);
        break;
      }

      offset += 8 + chunkSize;
      // Chunks are 2-byte aligned
      if (chunkSize % 2 !== 0) offset += 1;
    }

    if (!dataOffset || dataLength <= 0 || (audioFormat !== 1 && audioFormat !== 3)) {
      return null;
    }

    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const totalFrames = Math.floor(dataLength / blockAlign);
    if (totalFrames <= 0) return null;

    const audioBuf = ctx.createBuffer(numChannels, totalFrames, sampleRate);
    const channelData: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channelData.push(audioBuf.getChannelData(c));
    }

    let readPos = dataOffset;
    if (audioFormat === 1) {
      // Linear PCM (16-bit or 24-bit integer)
      if (bitsPerSample === 16) {
        for (let i = 0; i < totalFrames; i++) {
          for (let c = 0; c < numChannels; c++) {
            const int16 = view.getInt16(readPos, true);
            channelData[c][i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
            readPos += 2;
          }
        }
      } else if (bitsPerSample === 24) {
        for (let i = 0; i < totalFrames; i++) {
          for (let c = 0; c < numChannels; c++) {
            const b0 = view.getUint8(readPos);
            const b1 = view.getUint8(readPos + 1);
            const b2 = view.getUint8(readPos + 2);
            let int24 = (b2 << 16) | (b1 << 8) | b0;
            if (int24 & 0x800000) int24 -= 0x1000000;
            channelData[c][i] = int24 / 8388608;
            readPos += 3;
          }
        }
      } else if (bitsPerSample === 8) {
        for (let i = 0; i < totalFrames; i++) {
          for (let c = 0; c < numChannels; c++) {
            const u8 = view.getUint8(readPos);
            channelData[c][i] = (u8 - 128) / 128;
            readPos += 1;
          }
        }
      } else {
        return null;
      }
    } else if (audioFormat === 3 && bitsPerSample === 32) {
      // 32-bit IEEE float
      for (let i = 0; i < totalFrames; i++) {
        for (let c = 0; c < numChannels; c++) {
          channelData[c][i] = view.getFloat32(readPos, true);
          readPos += 4;
        }
      }
    } else {
      return null;
    }

    return audioBuf;
  } catch (err) {
    console.warn('PCM WAV parse error:', err);
    return null;
  }
}

export async function decodeAudioDataSafe(
  ctx: AudioContext,
  data: ArrayBuffer | Blob | File,
  _trackType: 'vocal' | 'beat' = 'vocal',
  fileName = 'audio'
): Promise<AudioBuffer | null> {
  let rawBuffer: ArrayBuffer;
  if (data instanceof ArrayBuffer) {
    rawBuffer = data;
  } else {
    try {
      rawBuffer = await data.arrayBuffer();
    } catch (err) {
      console.warn(`Failed to read ArrayBuffer for "${fileName}":`, err);
      return null;
    }
  }

  // Reject empty or corrupt dummy data
  if (!rawBuffer || rawBuffer.byteLength < 64) {
    console.warn(`Audio buffer too small (${rawBuffer?.byteLength || 0} bytes) for "${fileName}"`);
    return null;
  }

  // Attempt 1: Standard Web Audio decode
  try {
    const decoded = await decodeWithAudioContext(ctx, rawBuffer);
    if (decoded && decoded.duration > 0) {
      return decoded;
    }
  } catch (_) {}

  // Attempt 2: Direct PCM WAV reader for WAV files with complex metadata
  try {
    const pcmDecoded = parsePcmWavFallback(ctx, rawBuffer);
    if (pcmDecoded && pcmDecoded.duration > 0) {
      return pcmDecoded;
    }
  } catch (_) {}

  const u8 = new Uint8Array(rawBuffer);

  // Attempt 3: Strip ID3v2 metadata if prepended to MP3 or WAV
  if (u8.length > 10 && u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
    const tagSize =
      ((u8[6] & 0x7f) << 21) |
      ((u8[7] & 0x7f) << 14) |
      ((u8[8] & 0x7f) << 7) |
      (u8[9] & 0x7f);
    const hasFooter = (u8[5] & 0x10) !== 0;
    const totalId3 = 10 + tagSize + (hasFooter ? 10 : 0);

    if (rawBuffer.byteLength > totalId3 + 64) {
      try {
        const sliced = rawBuffer.slice(totalId3);
        const decoded = await decodeWithAudioContext(ctx, sliced);
        if (decoded && decoded.duration > 0) {
          return decoded;
        }
        // Try PCM parser on sliced data as well
        const pcm = parsePcmWavFallback(ctx, sliced);
        if (pcm && pcm.duration > 0) {
          return pcm;
        }
      } catch (_) {}
    }
  }

  // Attempt 4: Locate embedded 'RIFF' chunk for WAV files with leading metadata
  const searchLimitRIFF = Math.min(8192, u8.length - 4);
  for (let i = 0; i < searchLimitRIFF; i++) {
    if (u8[i] === 0x52 && u8[i + 1] === 0x49 && u8[i + 2] === 0x46 && u8[i + 3] === 0x46) {
      if (i > 0) {
        try {
          const sliced = rawBuffer.slice(i);
          const decoded = await decodeWithAudioContext(ctx, sliced);
          if (decoded && decoded.duration > 0) {
            return decoded;
          }
          const pcm = parsePcmWavFallback(ctx, sliced);
          if (pcm && pcm.duration > 0) {
            return pcm;
          }
        } catch (_) {}
      }
      break;
    }
  }

  // Attempt 5: Locate MP3 frame sync word (0xFF followed by 0xFB, 0xFA, 0xF3, 0xF2, etc.)
  const searchLimitMP3 = Math.min(16384, u8.length - 2);
  for (let i = 0; i < searchLimitMP3; i++) {
    if (u8[i] === 0xff && (u8[i + 1] & 0xe0) === 0xe0) {
      if (i > 0) {
        try {
          const sliced = rawBuffer.slice(i);
          const decoded = await decodeWithAudioContext(ctx, sliced);
          if (decoded && decoded.duration > 0) {
            return decoded;
          }
        } catch (_) {}
      }
      break;
    }
  }

  console.warn(`Could not decode audio data for file "${fileName}" (${rawBuffer.byteLength} bytes).`);
  return null;
}

