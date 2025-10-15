const puppeteer = require('puppeteer');

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  if (num === 0) return 'Zero';

  function convertHundreds(n) {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  }

  let result = '';
  let place = 0;
  
  while (num > 0) {
    if (place === 0) {
      if (num % 1000 !== 0) {
        result = convertHundreds(num % 1000) + thousands[place] + ' ' + result;
      }
      num = Math.floor(num / 1000);
      place++;
    } else if (place === 1) {
      if (num % 100 !== 0) {
        result = convertHundreds(num % 100) + thousands[place] + ' ' + result;
      }
      num = Math.floor(num / 100);
      place++;
    } else {
      if (num % 100 !== 0) {
        result = convertHundreds(num % 100) + thousands[place] + ' ' + result;
      }
      num = Math.floor(num / 100);
      place++;
    }
  }

  return result.trim() + ' Only';
}

function generateReceiptHTML(receiptData) {
  const {
    receiptNumber,
    date,
    time,
    student,
    guardian,
    admissionNumber,
    className,
    feeBreakdown,
    totalAmount,
    discount,
    amountPaid,
    balanceDue,
    paymentMethod,
    staffName
  } = receiptData;

  const amountInWords = numberToWords(Math.floor(amountPaid));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>School Fee Payment Receipt</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background-color: #f3f4f6;
            padding: 20px;
        }
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 4px solid #10B981;
        }
        .school-name {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .receipt-title {
            font-size: 14px;
            color: #6b7280;
        }
        .contact-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
            padding: 16px;
            background-color: #f0fdf4;
            border-radius: 8px;
            border: 1px solid #10B981;
        }
        .info-section {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        .field {
            margin-bottom: 8px;
        }
        .field-label {
            font-weight: 500;
            color: #4b5563;
            display: inline-block;
            min-width: 120px;
        }
        .field-value {
            font-weight: 600;
            color: #1f2937;
        }
        .fee-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .fee-table th,
        .fee-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .fee-table th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
        }
        .summary {
            text-align: right;
            margin-bottom: 30px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .total-row {
            font-size: 18px;
            font-weight: bold;
            color: #10B981;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
        }
        .amount-words {
            background-color: #eff6ff;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #3b82f6;
            margin-bottom: 30px;
        }
        .footer-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .signature {
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #9ca3af;
            margin-top: 40px;
            padding-top: 4px;
            font-size: 12px;
            color: #6b7280;
        }
        .footer-note {
            text-align: center;
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <h1 class="school-name">Arohan School</h1>
            <p class="receipt-title">Official Fee Payment Receipt</p>
        </div>

        <div class="contact-info">
            <div>
                <span class="field-label">Contact:</span>
                <span class="field-value">+91-9876543210</span>
            </div>
            <div>
                <span class="field-label">Email:</span>
                <span class="field-value">info@arohanschool.edu</span>
            </div>
            <div style="grid-column: span 2;">
                <span class="field-label">Address:</span>
                <span class="field-value">123 Education Street, Knowledge City, State, PIN-123456</span>
            </div>
        </div>

        <div class="info-section">
            <div>
                <h2 class="section-title">Transaction Details</h2>
                <div class="field">
                    <span class="field-label">Receipt Number:</span>
                    <span class="field-value">${receiptNumber}</span>
                </div>
                <div class="field">
                    <span class="field-label">Date:</span>
                    <span class="field-value">${date}</span>
                </div>
                <div class="field">
                    <span class="field-label">Time:</span>
                    <span class="field-value">${time}</span>
                </div>
            </div>

            <div>
                <h2 class="section-title">Student & Guardian Details</h2>
                <div class="field">
                    <span class="field-label">Student Name:</span>
                    <span class="field-value">${student}</span>
                </div>
                <div class="field">
                    <span class="field-label">Guardian Name:</span>
                    <span class="field-value">${guardian}</span>
                </div>
                <div class="field">
                    <span class="field-label">Admission No.:</span>
                    <span class="field-value">${admissionNumber}</span>
                </div>
                <div class="field">
                    <span class="field-label">Class:</span>
                    <span class="field-value">${className}</span>
                </div>
            </div>
        </div>

        <div>
            <h2 class="section-title">Fees Breakdown</h2>
            <table class="fee-table">
                <thead>
                    <tr>
                        <th>Fee Component</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${feeBreakdown.map(fee => `
                    <tr>
                        <td>${fee.name}</td>
                        <td style="text-align: right;">₹ ${fee.amount.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="summary">
                <div class="summary-row">
                    <span>Total Amount:</span>
                    <span>₹ ${totalAmount.toLocaleString()}</span>
                </div>
                ${discount > 0 ? `
                <div class="summary-row" style="color: #dc2626;">
                    <span>Discount:</span>
                    <span>- ₹ ${discount.toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="summary-row total-row">
                    <span>Amount Paid:</span>
                    <span>₹ ${amountPaid.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div class="amount-words">
            <p><strong>Amount in Words:</strong> Rupees ${amountInWords}</p>
            <p style="margin-top: 8px; color: ${balanceDue > 0 ? '#dc2626' : '#059669'};"><strong>Balance Due:</strong> ₹ ${balanceDue.toLocaleString()}</p>
        </div>

        <div class="footer-section">
            <div>
                <span class="field-label">Payment Method:</span>
                <p class="field-value">${paymentMethod}</p>
            </div>
            <div>
                <span class="field-label">Staff Name:</span>
                <p class="field-value">${staffName}</p>
            </div>
            <div class="signature">
                <p style="font-weight: 600;">(Digital Receipt)</p>
                <div class="signature-line">Authorized Signature / School Seal</div>
            </div>
        </div>

        <div class="footer-note">
            <p>This is a computer-generated receipt and may not require a physical signature.</p>
        </div>
    </div>
</body>
</html>
  `;
}

async function generateReceiptPDF(receiptData) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    const html = generateReceiptHTML(receiptData);
    
    console.log('Setting HTML content for PDF generation');
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Generating PDF');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    console.log('PDF generated successfully, size:', pdf.length);
    return pdf;
  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateReceiptPDF };