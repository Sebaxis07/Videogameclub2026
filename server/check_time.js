const https = require('https');

function getInternetTime() {
  return new Promise((resolve, reject) => {
    const req = https.get('https://google.com', (res) => {
      const dateStr = res.headers.date;
      if (dateStr) {
        resolve(new Date(dateStr));
      } else {
        reject(new Error("No date header"));
      }
    });
    req.on('error', reject);
  });
}

async function check() {
  try {
    const internetTime = await getInternetTime();
    const systemTime = new Date();
    const diffSeconds = Math.abs((systemTime - internetTime) / 1000);
    
    console.log("Internet Time:", internetTime.toISOString());
    console.log("System Time:  ", systemTime.toISOString());
    console.log(`Difference:    ${diffSeconds} seconds`);
    
    if (diffSeconds > 300) {
      console.warn("WARNING: Your system clock is off by more than 5 minutes! This will cause 'Invalid JWT Signature' errors from Google APIs.");
    } else {
      console.log("System clock is within 5 minutes of real time.");
    }
  } catch (err) {
    console.error("Error checking time:", err.message);
  }
}

check();
