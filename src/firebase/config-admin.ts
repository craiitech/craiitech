// This configuration is used for the Firebase Admin SDK on the server-side.

// The private key from the environment variable often comes with escaped newlines (\\n).
// Firebase Admin SDK's cert() function requires actual newline characters (\n).
// This line of code fixes that by replacing the escaped characters.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export const firebaseAdminConfig = {
  "projectId": process.env.FIREBASE_PROJECT_ID,
  "privateKey": privateKey,
  "clientEmail": process.env.FIREBASE_CLIENT_EMAIL,
};
