
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "RSU EOMS Submission Portal",
    autoHideMenuBar: true, // Hides the top menu for a cleaner look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // During development, load the local Next.js server
  // In production, you would point this to the hosted URL or a local static build
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:9002' 
    : 'http://localhost:9002'; // For MVP, we keep it simple

  win.loadURL(startUrl);

  // Open external links in the default browser (e.g., Google Drive links)
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
