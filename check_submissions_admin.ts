import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK locally
// Next.js dev server uses FIREBASE_SERVICE_ACCOUNT or ADC.
// Let's try initializing it using standard Node environment (ADC or project ID).
const projectId = "studio-9288801258-68151";

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const db = admin.firestore();

async function run() {
  console.log("=== SUBMISSIONS (ADMIN) ===");
  const subsSnapshot = await db.collection("submissions").get();
  console.log(`Total Submissions: ${subsSnapshot.size}`);
  subsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`Sub ID: ${doc.id} | Unit: ${data.unitName} | Type: ${data.reportType} | StatusId: ${data.statusId} | Revision: ${data.revision} | Date: ${data.submissionDate?.toDate?.() || data.submissionDate}`);
  });

  console.log("\n=== UNIT FORM REQUESTS (ADMIN) ===");
  const requestsSnapshot = await db.collection("unitFormRequests").get();
  console.log(`Total Unit Form Requests: ${requestsSnapshot.size}`);
  requestsSnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`Req ID: ${doc.id} | Unit: ${data.unitName} | Status: ${data.status} | CreatedAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
  });
}

run().catch(console.error);
