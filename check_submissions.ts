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
  console.log("=== SUBMISSIONS ===");
  const subsSnapshot = await getDocs(collection(db, "submissions"));
  console.log(`Total Submissions: ${subsSnapshot.size}`);
  subsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`Sub ID: ${doc.id} | Unit: ${data.unitName} | Type: ${data.reportType} | StatusId: ${data.statusId} | Revision: ${data.revision} | Date: ${data.submissionDate?.toDate?.() || data.submissionDate}`);
  });

  console.log("\n=== UNIT FORM REQUESTS ===");
  const requestsSnapshot = await getDocs(collection(db, "unitFormRequests"));
  console.log(`Total Unit Form Requests: ${requestsSnapshot.size}`);
  requestsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`Req ID: ${doc.id} | Unit: ${data.unitName} | Status: ${data.status} | CreatedAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
  });
}

run().catch(console.error);
