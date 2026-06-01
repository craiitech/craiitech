import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "studio-9288801258-68151",
  "appId": "1:60303767170:web:e3a63661037539f80ca69b",
  "apiKey": "AIzaSyBV89dKZPYpXnuceUCZ86MQ5EbOtEXHuvs",
  "authDomain": "studio-9288801258-68151.firebaseapp.com",
  "messagingSenderId": "60303767170"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Querying Firestore correctiveActionRequests...");
  const querySnapshot = await getDocs(collection(db, "correctiveActionRequests"));
  console.log(`Total records: ${querySnapshot.size}`);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`CAR: ${data.carNumber} | Status: ${data.status} | Source: ${data.source} | Procedure: ${data.procedureTitle}`);
  });
}

run().catch(console.error);
