/**
 * Direct client for the Francoflex Cloud Run pronunciation analysis service.
 * Uses /api/analyze-quick for fast (~8s) scores without TTS/LLM enrichment.
 */

/**
 * Same-origin endpoint. Defaults to the Next.js proxy at /api/pronunciation
 * to avoid Cloud Run's CORS allowlist. Override with
 * NEXT_PUBLIC_PRONUNCIATION_ENDPOINT to hit Cloud Run directly.
 */
const PRONUNCIATION_ENDPOINT =
  process.env.NEXT_PUBLIC_PRONUNCIATION_ENDPOINT ?? '/api/pronunciation';

const LANGUAGE_MAP: Record<string, string> = {
  fr: 'French',
  'fr-fr': 'French',
  'fr-ca': 'French',
  es: 'Spanish',
  en: 'English',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
};

export interface AnalyzeOptions {
  audio: Blob;
  targetText: string;
  targetLanguage?: string;
  nativeLanguage?: string;
  sessionId?: string;
  userId?: string;
}

export async function analyzePronunciationQuick(opts: AnalyzeOptions): Promise<unknown> {
  // Wrap in a File so the multipart part carries Content-Type: audio/wav
  // (the Cloud Run service rejects application/octet-stream).
  const file =
    typeof File !== 'undefined'
      ? new File([opts.audio], 'recording.wav', { type: 'audio/wav' })
      : opts.audio;

  const formData = new FormData();
  formData.append('audio_file', file, 'recording.wav');
  formData.append('target_text', opts.targetText);

  if (opts.sessionId) formData.append('session_id', opts.sessionId);
  if (opts.userId) formData.append('user_id', opts.userId);

  if (opts.targetLanguage) {
    formData.append('dialect', opts.targetLanguage);
    const langCode = opts.targetLanguage.split('-')[0] ?? opts.targetLanguage;
    formData.append('target_language', LANGUAGE_MAP[langCode] ?? 'French');
  }
  if (opts.nativeLanguage) {
    const code = opts.nativeLanguage.split('-')[0] ?? opts.nativeLanguage;
    formData.append('native_language', LANGUAGE_MAP[code] ?? 'English');
  }

  let res: Response;
  try {
    res = await fetch(PRONUNCIATION_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
  } catch (e) {
    // "TypeError: Failed to fetch" — usually CORS or network. Surface origin
    // so the caller can verify Cloud Run's allowlist covers it.
    const origin = typeof window !== 'undefined' ? window.location.origin : 'n/a';
    throw new Error(
      `Network/CORS failure calling pronunciation API from origin ${origin}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pronunciation API ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
}
