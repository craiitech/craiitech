import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limit';

const DRIVE_LINK_RATE_LIMIT = { name: 'drive-link-validation', limit: 12, windowSeconds: 60 };

const isGoogleDriveHost = (hostname: string) =>
  hostname === 'google.com' ||
  hostname.endsWith('.google.com') ||
  hostname === 'googleusercontent.com' ||
  hostname.endsWith('.googleusercontent.com');

async function readResponsePreview(response: Response, maxBytes = 16_384): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, maxBytes - bytesRead);
      chunks.push(chunk);
      bytesRead += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const preview = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    preview.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(preview);
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, DRIVE_LINK_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { url } = await req.json();

    if (typeof url !== 'string') {
      return NextResponse.json(
        { isAccessible: false, reason: 'Please provide a valid Google Drive or Docs link.' },
        { status: 400 },
      );
    }

    const trimmedUrl = url.trim();
    let initialUrl: URL;
    try {
      initialUrl = new URL(trimmedUrl);
    } catch {
      return NextResponse.json(
        { isAccessible: false, reason: 'Please provide a valid Google Drive or Docs link.' },
        { status: 400 },
      );
    }

    if (initialUrl.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(initialUrl.hostname)) {
      return NextResponse.json(
        { isAccessible: false, reason: 'Please provide a valid Google Drive or Docs link.' },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let finalUrl = initialUrl.toString();
    let reason = 'The link is private or restricted. Please set sharing to "Anyone with the link".';

    try {
      let currentUrl = initialUrl;
      let response: Response | undefined;

      for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
        if (!isGoogleDriveHost(currentUrl.hostname)) {
          reason = 'The Google Drive link redirected to an untrusted destination.';
          break;
        }

        finalUrl = currentUrl.toString();
        response = await fetch(currentUrl, {
          method: 'GET',
          headers: { Range: 'bytes=0-16383' },
          redirect: 'manual',
          signal: controller.signal,
        });

        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        if (!location || redirectCount === 5) {
          reason = 'The link could not be opened because it redirected too many times.';
          response = undefined;
          break;
        }
        currentUrl = new URL(location, currentUrl);
      }

      const isLoginRedirect = currentUrl.hostname === 'accounts.google.com';
      if (isLoginRedirect) {
        reason = 'This link requires a Google sign-in to view.';
      } else if (response?.ok) {
        const contentType = response.headers.get('content-type') || '';
        const preview = contentType.includes('text/html') ? (await readResponsePreview(response)).toLowerCase() : '';
        const accessErrorTerms = [
          'you need access',
          'request access',
          'access denied',
          'file you have requested does not exist',
          "couldn't find the file",
          "can't find the file",
        ];
        if (accessErrorTerms.some((term) => preview.includes(term))) {
          reason = 'No access or file not found. Check the sharing permissions and link.';
        } else {
          return NextResponse.json({
            isAccessible: true,
            reason: 'Link appears to be accessible.',
            finalUrl,
          });
        }
      } else if (response) {
        reason = `The link returned a status of ${response.status}. It may be broken or you may not have access.`;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        reason = 'The validation request timed out. Please try again.';
      } else {
        console.error('Drive Link Validation Error:', error);
        reason = 'An unexpected error occurred while trying to validate the link.';
      }
    } finally {
      clearTimeout(timeoutId);
    }

    return NextResponse.json({ isAccessible: false, reason, finalUrl });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ isAccessible: false, reason: 'Invalid request format.' }, { status: 400 });
  }
}
