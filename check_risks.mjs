import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-9288801258-68151",
  appId: "1:60303767170:web:e3a63661037539f80ca69b",
  apiKey: "AIzaSyBV89dKZPYpXnuceUCZ86MQ5EbOtEXHuvs",
  authDomain: "studio-9288801258-68151.firebaseapp.com",
  messagingSenderId: "60303767170"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("=== Finding User Marvin Rick Forcado ===");
  const usersSnapshot = await getDocs(collection(db, "users"));
  let targetUser = null;
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.firstName?.includes("Marvin") || data.lastName?.includes("Forcado")) {
      targetUser = { id: doc.id, ...data };
    }
  });

  if (!targetUser) {
    console.error("User Marvin Rick Forcado not found.");
    return;
  }

  console.log(`Found User: ${targetUser.firstName} ${targetUser.lastName}`);
  console.log(`Unit ID: ${targetUser.unitId}`);
  console.log(`Campus ID: ${targetUser.campusId}`);

  console.log("\n=== Fetching Risks for 2025 ===");
  const risksQuery = query(
    collection(db, "risks"),
    where("unitId", "==", targetUser.unitId),
    where("campusId", "==", targetUser.campusId),
    where("year", "==", 2025)
  );

  const risksSnapshot = await getDocs(risksQuery);
  console.log(`Found ${risksSnapshot.size} risks for year 2025:`);
  
  risksSnapshot.forEach((doc) => {
    const r = doc.data();
    console.log(`----------------------------------------`);
    console.log(`ID: ${doc.id}`);
    console.log(`Description: ${r.description}`);
    console.log(`Type: ${r.type}`);
    console.log(`Status: ${r.status}`);
    console.log(`Rating: ${r.rating}`);
    console.log(`Post-Treatment:`, JSON.stringify(r.postTreatment, null, 2));
    
    // Check if postTreatment fields are missing
    const missingFields = [];
    if (!r.postTreatment?.likelihood) missingFields.push("likelihood");
    if (!r.postTreatment?.consequence) missingFields.push("consequence");
    if (!r.postTreatment?.evidence) missingFields.push("evidence");
    
    if (missingFields.length > 0) {
      console.log(`Missing Post-Treatment Fields: ${missingFields.join(", ")}`);
    } else {
      console.log(`Post-Treatment is Complete!`);
    }
  });
}

run().catch(console.error);
