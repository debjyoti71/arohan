# Google Sheets Integration Setup

This guide explains how to set up Google Sheets integration for the Year Promotion feature.

## Prerequisites

1. Google Cloud Console account
2. Google Sheets API enabled
3. Service Account with appropriate permissions

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API

### 2. Create a Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in the details and create
4. Generate a JSON key file for the service account

### 3. Create a Google Sheet

1. Create a new Google Sheet
2. Copy the Sheet ID from the URL (the long string between `/d/` and `/edit`)
3. Share the sheet with your service account email (with Editor permissions)

### 4. Configure Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
```

### 5. Test the Integration

1. Restart your server
2. Go to Configuration page
3. Click "Start Year Promotion"
4. Check if the outstanding fees data appears in your Google Sheet

## Troubleshooting

- Make sure the service account has access to the Google Sheet
- Verify that the Google Sheets API is enabled in your project
- Check that the private key is properly formatted with `\n` for line breaks
- Ensure the sheet ID is correct (from the URL)

## Security Notes

- Keep your service account credentials secure
- Don't commit the actual private key to version control
- Use environment variables for all sensitive data
- Regularly rotate your service account keys