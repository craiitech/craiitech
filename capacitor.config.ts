import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craiitech.eoms',
  appName: 'RSU EOMS Portal',
  webDir: 'capacitor/www',
  server: {
    // Development: run `next dev -p 9002`, enable cleartext, and uncomment url below.
    // Production: update url to your deployed app (e.g., Firebase Hosting URL).
    // url: 'http://localhost:9002',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
