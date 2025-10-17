const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

class GoogleSheetsLogger {
  constructor() {
    this.doc = null;
    this.sheet = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
      await this.doc.loadInfo();
      
      this.sheet = this.doc.sheetsByIndex[0] || await this.doc.addSheet({ 
        title: 'Activity Log',
        headerValues: ['Timestamp', 'User', 'Alias', 'Action', 'Resource', 'Details', 'IP Address']
      });

      this.initialized = true;
    } catch (error) {
      console.error('Google Sheets initialization error:', error);
    }
  }

  async logActivity(data) {
    try {
      await this.initialize();
      if (!this.sheet) return;

      await this.sheet.addRow({
        Timestamp: new Date().toISOString(),
        User: data.username,
        Alias: data.alias || '',
        Action: data.action,
        Resource: data.resource,
        Details: JSON.stringify(data.details || {}),
        'IP Address': data.ipAddress || ''
      });
    } catch (error) {
      console.error('Google Sheets logging error:', error);
    }
  }
}

module.exports = new GoogleSheetsLogger();