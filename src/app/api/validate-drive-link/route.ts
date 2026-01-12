
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string' || !url.startsWith('https://drive.google.com/')) {
      return NextResponse.json({ isAccessible: false, reason: 'Please provide a valid Google Drive link.' }, { status: 400 });
    }

    let isAccessible = false;
    let reason = 'The link is private or restricted. Please set sharing to "Anyone with the link".';
    let finalUrl = '';

    try {
      // Use a short timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow', // Important to follow redirects
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      finalUrl = response.url;
      
      // If we are redirected to a login page, it's not public.
      if (finalUrl.includes('accounts.google.com')) {
          isAccessible = false;
          reason = 'This link requires a Google sign-in to view.';
      } else if (response.ok) {
          // If the final response is OK, we consider it accessible.
          // This is a simplification. A more robust check might look at content-type,
          // but for most viewable files, following the redirect is sufficient.
          isAccessible = true;
          reason = 'Link appears to be accessible.';
      } else {
          // If the response is not OK (e.g., 404, 403)
          isAccessible = false;
          reason = `The link returned a status of ${response.status}. It may be broken or you may not have access.`
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        reason = 'The validation request timed out. Please try again.';
      } else {
        console.error('Drive Link Validation Error:', error);
        reason = 'An unexpected error occurred while trying to validate the link.';
      }
      isAccessible = false;
    }

    return NextResponse.json({ isAccessible, reason, finalUrl });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ isAccessible: false, reason: 'Invalid request format.' }, { status: 400 });
  }
}

    