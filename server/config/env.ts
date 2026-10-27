import dotenv from 'dotenv';

dotenv.config();

// Clean up Google Drive environment variables (remove surrounding quotes if any)
const googleEnvVars = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_DRIVE_CLIENT_ID',
  'GOOGLE_DRIVE_CLIENT_SECRET',
  'GOOGLE_DRIVE_REFRESH_TOKEN',
  'GOOGLE_DRIVE_PARENT_FOLDER_ID',
  'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  'GOOGLE_DRIVE_FOLDER_ID',
  'DRIVE_PARENT_FOLDER_ID',
  'DRIVE_ROOT_ID'
];

googleEnvVars.forEach(name => {
  const val = process.env[name];
  if (val) {
    let cleanVal = val.trim();
    if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
      cleanVal = cleanVal.slice(1, -1).trim();
    }
    if (cleanVal.startsWith("'") && cleanVal.endsWith("'")) {
      cleanVal = cleanVal.slice(1, -1).trim();
    }
    // Specially handle GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY newlines if escaped
    if (name === 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') {
      if (cleanVal.includes('\\n')) {
        cleanVal = cleanVal.replace(/\\n/g, '\n');
      }
    }
    process.env[name] = cleanVal;
  }
});
