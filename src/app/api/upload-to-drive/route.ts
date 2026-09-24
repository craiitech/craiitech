import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { extractDriveFolderId } from '@/lib/utils';

const DEFAULT_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbww5SZCg_SUIBP9x-gcuUlTmjiirEPuxgpUKdSYhv-_2j_7hBMPMyR2n7OvmraMfZIRuA/exec';

/**
 * Executes a POST request to Google Apps Script and follows the 302 redirect to Google usercontent
 * with clean streaming and no undici socket timeouts.
 */
function sendToGoogleAppsScript(
  targetUrl: string,
  payload: any,
  timeoutMs = 90000,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const u = new URL(targetUrl);
    const isHttps = u.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'CRAIITECH-EOMS/1.0',
        },
        timeout: timeoutMs,
      },
      (res) => {
        // Google Apps Script doPost redirects (302) to script.googleusercontent.com/macros/echo?...
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location;
          const redirectU = new URL(redirectUrl);
          const redirectClient = redirectU.protocol === 'https:' ? https : http;

          const redirectReq = redirectClient.get(
            redirectUrl,
            {
              headers: {
                'User-Agent': 'CRAIITECH-EOMS/1.0',
                Accept: 'application/json, text/plain, */*',
              },
              timeout: timeoutMs,
            },
            (redirectRes) => {
              let body = '';
              redirectRes.setEncoding('utf8');
              redirectRes.on('data', (chunk) => {
                body += chunk;
              });
              redirectRes.on('end', () => {
                resolve({ status: redirectRes.statusCode || 200, body });
              });
            },
          );

          redirectReq.on('error', (err) => reject(err));
          redirectReq.on('timeout', () => {
            redirectReq.destroy(new Error(`Google Apps Script redirect timed out after ${timeoutMs}ms.`));
          });
        } else {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode || 200, body });
          });
        }
      },
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy(new Error(`Upload request to Google Apps Script timed out after ${timeoutMs}ms.`));
    });

    req.write(data);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    let folderId = '';
    let fileName = '';
    let fileBase64 = '';
    let mimeType = 'application/pdf';
    let scriptUrl = DEFAULT_SCRIPT_URL;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      folderId = (formData.get('folderId') as string) || '';
      scriptUrl = (formData.get('scriptUrl') as string) || DEFAULT_SCRIPT_URL;
      const customFileName = formData.get('fileName') as string | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in the upload request.' }, { status: 400 });
      }

      fileName = customFileName || file.name;
      mimeType = file.type || 'application/pdf';
      const arrayBuffer = await file.arrayBuffer();
      fileBase64 = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const json = await req.json();
      folderId = json.folderId || '';
      fileName = json.fileName || 'submission-document.pdf';
      fileBase64 = json.fileBase64 || '';
      mimeType = json.mimeType || 'application/pdf';
      scriptUrl = json.scriptUrl || DEFAULT_SCRIPT_URL;
    }

    const OLD_BROKEN_ID = 'AKfycbzpfF8eVZdOKUkteR_yrnJYrQ-v2t9Gxye-EuXX6IaExDEJHmeBEcN18W0TnvJDstki0Q';
    if (!scriptUrl || scriptUrl.includes(OLD_BROKEN_ID)) {
      scriptUrl = DEFAULT_SCRIPT_URL;
    }

    const cleanFolderId = extractDriveFolderId(folderId);

    if (!cleanFolderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid Google Drive Folder ID. Please check the campus settings in System Settings.',
        },
        { status: 400 },
      );
    }

    if (!fileBase64) {
      return NextResponse.json({ success: false, error: 'File content is empty or unreadable.' }, { status: 400 });
    }

    console.log('UPLOAD TO DRIVE ATTEMPT:', {
      scriptUrl,
      folderId,
      cleanFolderId,
      fileName,
      mimeType,
      fileSizeBase64: fileBase64.length,
    });

    const gScriptResponse = await sendToGoogleAppsScript(
      scriptUrl,
      {
        folderId: cleanFolderId,
        fileName,
        fileBase64,
        mimeType,
      },
      90000,
    );

    const responseText = gScriptResponse.body;
    console.log('G_SCRIPT STATUS:', gScriptResponse.status, 'RESPONSE BODY:', responseText.slice(0, 500));

    // Check if Google redirected to a sign-in or authorization error page
    if (
      responseText.includes('accounts.google.com') ||
      responseText.includes('Service Login') ||
      responseText.includes('Kailangan mo ng access') ||
      responseText.includes('You need permission')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Google Apps Script authorization error. In Google Apps Script, ensure "Deploy > Manage deployments > Who has access" is set to "Anyone".',
        },
        { status: 403 },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Google Apps Script response:', responseText.slice(0, 300));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid response from Google Drive bridge. Please verify your Google Apps Script deployment.',
          rawResponse: responseText.slice(0, 200),
        },
        { status: 502 },
      );
    }

    if (!parsed.success) {
      const errMsg = parsed.error || '';
      // Check for permission/access denied to the specific folder
      if (
        errMsg.includes('Tinanggihang bigyan ng access') ||
        errMsg.toLowerCase().includes('access denied') ||
        errMsg.includes('DriveApp')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Access Denied to Google Drive folder: The Google account hosting the Apps Script Web App does not have Editor permission for folder "${cleanFolderId}". Please open Google Drive and share this folder with that Google account as an "Editor", or use a folder created by that account.`,
            rawError: errMsg,
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: errMsg || 'Failed to upload file to Google Drive.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      fileId: parsed.fileId,
      fileUrl: parsed.fileUrl,
      webViewLink: parsed.webViewLink || parsed.fileUrl,
      fileName: parsed.fileName || fileName,
      folderId: cleanFolderId,
    });
  } catch (error: any) {
    console.error('Drive upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred during document upload.',
      },
      { status: 500 },
    );
  }
}
