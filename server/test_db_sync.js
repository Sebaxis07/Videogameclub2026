const connectDB = require('./config/db');
const sheetsService = require('./services/sheetsService');

async function runTest() {
  await connectDB();
  console.log("DB connected.");
  
  try {
    const result = await sheetsService.syncFromSheets();
    console.log("Sync result:", result);
  } catch (err) {
    console.error("Sync failed:", err);
  }
  process.exit(0);
}

runTest();
