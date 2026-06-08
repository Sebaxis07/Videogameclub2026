"use strict";

const path = require("path");
require("dotenv").config();

const config = {
  // Server Config
  PORT: parseInt(process.env.PORT, 10) || 3001,
  SYNC_INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL_MS, 10) || 30000,

  // Google Sheets Config
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  SHEET_RANGE: process.env.SHEET_RANGE || "ClubVideoJuegos!A1:G200",
  SHEET_NAME: process.env.SHEET_NAME || "ClubVideojuegos",
  
  // Auth Config
  GOOGLE_SERVICE_ACCOUNT_KEY_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON,
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
    ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
    : null,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Becky0704"
};

// No longer validating Google Sheets credentials as database is now local-first

module.exports = Object.freeze(config);
