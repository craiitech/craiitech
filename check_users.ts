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
  console.log("=== ROLES ===");
  const rolesSnapshot = await getDocs(collection(db, "roles"));
  rolesSnapshot.forEach((doc) => {
    console.log(`Role ID: ${doc.id} | Name: ${doc.data().name}`);
  });

  console.log("\n=== USERS ===");
  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`User: ${data.firstName} ${data.lastName} | Email: ${data.email} | Role: ${data.role} | Unit ID: ${data.unitId}`);
  });
}

run().catch(console.error);
