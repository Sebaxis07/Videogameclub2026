const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function test() {
  const keyFile = path.resolve(__dirname, 'thermal-land-457422-n0-8332d81797cb.json');
  console.log("Reading key from:", keyFile);
  
  if (!fs.existsSync(keyFile)) {
    console.error("File does not exist!");
    return;
  }
  
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  
  const sheets = google.sheets({ version: "v4", auth });
  
  try {
    console.log("Fetching spreadsheet data...");
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '17oLPkIhqpUzrLztAjfmCsJxdnnSvurqIi4Lfpyof7eg',
      range: 'ClubVideoJuegos!A1:G200',
    });
    console.log("Success! Rows retrieved:", res.data.values ? res.data.values.length : 0);
  } catch (err) {
    console.error("Error fetching sheets:", err.message);
  }
}

test();
