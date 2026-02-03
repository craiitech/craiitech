# Installing RSU EOMS Portal on Windows

This guide explains how to package and install the RSU EOMS Portal as a standalone Windows application (.exe).

## Prerequisites
Before you begin, ensure you have the following installed on your Windows machine:
1. **Node.js (LTS Version):** Download from [https://nodejs.org/](https://nodejs.org/)
2. **Internet Connection:** Required for downloading dependencies and connecting to the Firebase database.

## Installation Steps

### 1. Download/Extract the Source Code
Ensure all project files are in a folder on your computer (e.g., `C:\RSU-Portal`).

### 2. Open a Terminal
Open **PowerShell** or **Command Prompt** and navigate to your project folder:
```bash
cd C:\Path\To\Your\Project
```

### 3. Install Required Components
Run this command to download the necessary libraries:
```bash
npm install
```

### 4. Build the Web Application
Next, prepare the portal code for production:
```bash
npm run build
```

### 5. Create the Windows Installer (.exe)
Run the packaging command to generate the executable:
```bash
npm run electron:build
```
*This process will create a `dist` folder in your project directory. It may take 2-5 minutes depending on your computer speed.*

### 6. Install the App
1. Open the `dist` folder.
2. Find the file named `RSU EOMS Portal Setup 0.1.0.exe` (the version number might vary).
3. **Double-click** the file to run the installer.
4. Once installed, the application will launch automatically, and you will find a shortcut on your **Desktop** and in the **Start Menu**.

## Troubleshooting
- **White Screen:** Ensure your computer is connected to the internet. Since the system uses Firebase, it needs a connection to load your data.
- **Permission Errors:** Run the terminal as an Administrator if you encounter errors during `npm install`.
