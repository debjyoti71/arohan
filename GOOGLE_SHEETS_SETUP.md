# Google Sheets Activity Logging Setup

This guide explains how to set up Google Sheets integration for activity logging in the Arohan School Management System.

## Prerequisites

1. Google Cloud Console account
2. Google Sheets API enabled
3. Service Account with appropriate permissions

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API

## Step 2: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in the details:
   - Name: `arohan-sheets-logger`
   - Description: `Service account for logging activities to Google Sheets`
4. Click "Create and Continue"
5. Skip role assignment (we'll handle permissions at sheet level)
6. Click "Done"

## Step 3: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the key file

## Step 4: Create Google Sheet

1. Create a new Google Sheet
2. Name it "Arohan Activity Log"
3. Share the sheet with the service account email (found in the JSON key file)
4. Give "Editor" permissions
5. Copy the Sheet ID from the URL (the long string between `/d/` and `/edit`)

## Step 5: Environment Variables

Add these variables to your `.env` file:

```env
# Google Sheets Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-sheet-id-here
```

**Important Notes:**
- Replace `your-service-account@your-project.iam.gserviceaccount.com` with the actual service account email
- Replace the private key with the actual private key from the JSON file
- Replace `your-sheet-id-here` with the actual Google Sheet ID
- Keep the quotes around the private key and preserve the `\n` characters

## Step 6: Test the Integration

1. Start your server: `npm run dev`
2. Perform any action in the application (login, create user, etc.)
3. Check your Google Sheet - you should see activity logs appearing

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Make sure the service account email has editor access to the sheet
2. **Invalid Private Key**: Ensure the private key is properly formatted with `\n` characters
3. **Sheet Not Found**: Verify the Sheet ID is correct
4. **API Not Enabled**: Make sure Google Sheets API is enabled in your Google Cloud project

### Log Checking:

Check server logs for any Google Sheets related errors:
```bash
# Look for lines containing "Google Sheets"
npm run dev | grep "Google Sheets"
```

## Security Considerations

1. Never commit the service account JSON file to version control
2. Use environment variables for all sensitive data
3. Regularly rotate service account keys
4. Limit sheet access to only necessary personnel
5. Consider using Google Cloud Secret Manager for production environments

## Activity Log Format

The system logs the following information:
- Timestamp
- Username
- User Alias
- Action performed
- Resource affected
- Additional details (JSON)
- IP Address

This provides a comprehensive audit trail of all system activities.