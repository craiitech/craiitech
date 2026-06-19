import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craiitech.eoms',
  appName: 'RSU EOMS Portal',
  webDir: 'capacitor/www',
  server: {
    // Production URL — the Android WebView loads the app from this address.
    // For local development, swap this to http://localhost:9002 and run `npm run dev`.
    url: 'https://eoms.rsu.edu.ph',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
