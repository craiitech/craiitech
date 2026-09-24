/**
 * Google Apps Script: EOMS Google Drive Upload Bridge
 * 
 * Paste this code into your Google Apps Script project (https://script.google.com).
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Click "Deploy" > "Manage deployments" (or "New deployment").
 * 2. Select type: "Web app".
 * 3. Settings:
 *    - Execute as: "Me (your email address)"
 *    - Who has access: "Anyone"  <-- CRITICAL: Must be "Anyone", NOT "Only myself"
 * 4. Click "Deploy" and authorize Google permissions.
 * 5. Copy the Web App URL (ends in /exec).
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No post data received'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId;
    var fileName = data.fileName || ('EOMS_Submission_' + new Date().getTime() + '.pdf');
    var fileBase64 = data.fileBase64;
    var mimeType = data.mimeType || 'application/pdf';

    if (!folderId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing destination folderId.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!fileBase64) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing fileBase64 payload.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Get destination campus folder
    var folder = DriveApp.getFolderById(folderId);

    // 2. Decode Base64 and create the file
    var decoded = Utilities.base64Decode(fileBase64);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var file = folder.createFile(blob);

    // 3. Set permission: Anyone with link can view (wrapped for institutional domains)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      // Automatically inherits folder sharing settings if institutional policy restricts public link
    }

    // 4. Return success with file URL
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing',
      webViewLink: 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing',
      folderId: folderId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    service: 'EOMS Google Drive Webhook Bridge',
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
