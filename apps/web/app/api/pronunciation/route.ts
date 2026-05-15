import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PRONUNCIATION_API_URL =
  process.env.NEXT_PUBLIC_PRONUNCIATION_API_URL ??
  'https://pronunciation-api-96843253648.northamerica-northeast1.run.app';

const PRONUNCIATION_API_KEY =
  process.env.PRONUNCIATION_API_KEY ??
  process.env.NEXT_PUBLIC_PRONUNCIATION_API_KEY ??
  'HAfps1WZGFaSTkH0IEJWhHjqSUSvYTpC4-Orl9V-gCA';

/**
 * Server-side proxy to the Cloud Run pronunciation analyzer.
 * Avoids the browser CORS allowlist on the Cloud Run side and keeps the
 * API key out of the bundle in production.
 */
export async function POST(req: NextRequest) {
  const incoming = await req.formData();
  const upstream = new FormData();
  for (const [key, value] of incoming.entries()) {
    upstream.append(key, value as Blob | string);
  }

  const res = await fetch(`${PRONUNCIATION_API_URL}/api/analyze-quick`, {
    method: 'POST',
    headers: PRONUNCIATION_API_KEY ? { 'x-api-key': PRONUNCIATION_API_KEY } : {},
    body: upstream,
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
