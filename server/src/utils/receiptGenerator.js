const puppeteer = require('puppeteer');

function numberToWords(num) {
  // Your numberToWords function remains unchanged...
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];
  if (num === 0) return 'Zero';
  function convertHundreds(n) { let result = ''; if (n >= 100) { result += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; } if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; } else if (n >= 10) { result += teens[n - 10] + ' '; return result; } if (n > 0) { result += ones[n] + ' '; } return result; }
  let result = ''; let place = 0;
  while (num > 0) { if (place === 0) { if (num % 1000 !== 0) { result = convertHundreds(num % 1000) + thousands[place] + ' ' + result; } num = Math.floor(num / 1000); place++; } else if (place === 1) { if (num % 100 !== 0) { result = convertHundreds(num % 100) + thousands[place] + ' ' + result; } num = Math.floor(num / 100); place++; } else { if (num % 100 !== 0) { result = convertHundreds(num % 100) + thousands[place] + ' ' + result; } num = Math.floor(num / 100); place++; } }
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
    paymentMethod,
    // staffName and balanceDue are no longer used
  } = receiptData;

  const amountInWords = numberToWords(Math.floor(amountPaid));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>School Fee Payment Receipt</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .receipt-field-label {
            font-weight: 500;
            color: #4B5563;
        }
        .receipt-field-value {
            font-weight: 600;
            color: #1F2937;
        }
    </style>
</head>
<body class="bg-gray-100 p-2">

    <div class="max-w-4xl mx-auto bg-white p-8 rounded-xl border border-gray-200">

        <header class="text-center mb-6 pb-4 border-b-4 border-emerald-500">
            <h1 class="text-4xl font-extrabold text-gray-900 mb-2">Arohan School</h1>
            <p class="text-sm text-gray-600">Official Fee Payment Receipt</p>
        </header>

        <section class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm mb-6 bg-emerald-50 p-4 rounded-lg border border-emerald-500/30">
            <div>
                <span class="receipt-field-label">Contact:</span>
                <p class="receipt-field-value text-emerald-600">+91-9876543210</p>
            </div>
            <div>
                <span class="receipt-field-label">Email:</span>
                <p class="receipt-field-value">info@arohanschool.edu</p>
            </div>
            <div class="md:col-span-1">
                <span class="receipt-field-label">Address:</span>
                <p class="receipt-field-value">123 Education Street, Knowledge City</p>
            </div>
        </section>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
                <h2 class="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Transaction Details</h2>
                <div class="space-y-2 text-sm">
                    <p><span class="receipt-field-label">Receipt No:</span> <span class="receipt-field-value">${receiptNumber}</span></p>
                    <p><span class="receipt-field-label">Date:</span> <span class="receipt-field-value">${date}</span></p>
                    <p><span class="receipt-field-label">Time:</span> <span class="receipt-field-value">${time}</span></p>
                    <p><span class="receipt-field-label">Payment Method:</span> <span class="receipt-field-value text-base">${paymentMethod}</span></p>
                </div>
            </div>

            <div>
                <h2 class="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Student & Guardian Details</h2>
                <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <p><span class="receipt-field-label">Student Name:</span> <span class="receipt-field-value">${student}</span></p>
                    <p><span class="receipt-field-label">Guardian Name:</span> <span class="receipt-field-value">${guardian}</span></p>
                    <p><span class="receipt-field-label">Admission No:</span> <span class="receipt-field-value text-emerald-600 font-mono">${admissionNumber}</span></p>
                    <p><span class="receipt-field-label">Class:</span> <span class="receipt-field-value">${className}</span></p>
                </div>
            </div>
        </div>

        <section class="mb-6">
            <h2 class="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Fees Breakdown</h2>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Component</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Ratio</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 text-sm">
                        ${feeBreakdown.map(fee => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap receipt-field-label">${fee.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right receipt-field-value">${fee.paymentRatio || 'N/A'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right receipt-field-value">${formatCurrency(fee.discount || 0)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right receipt-field-value font-bold">${formatCurrency(fee.amountPaid)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="flex justify-end mt-4">
                <div class="w-full sm:w-80 space-y-2 text-sm">
                    <div class="flex justify-between font-medium">
                        <span class="text-gray-600">Total Due for Transaction:</span>
                        <span class="receipt-field-value">${formatCurrency(totalAmount)}</span>
                    </div>
                    ${discount > 0 ? `
                    <div class="flex justify-between text-red-600 font-semibold">
                        <span class="text-gray-600">Total Discount:</span>
                        <span class="receipt-field-value">- ${formatCurrency(discount)}</span>
                    </div>` : ''}
                    <div class="flex justify-between text-lg font-bold text-gray-900 border-t-2 border-emerald-500 mt-2 pt-2">
                        <span>Amount Paid:</span>
                        <span class="text-emerald-600">${formatCurrency(amountPaid)}</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p class="text-base font-semibold text-gray-800">
                <span class="receipt-field-label">In Words:</span>
                <span class="receipt-field-value">Rupees ${amountInWords}</span>
            </p>
        </section>

        <section class="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-gray-200 text-sm">
            <div></div>

            <div class="text-center">
                <p class="text-gray-900 font-semibold mb-8">(Digital Receipt)</p>
                <div class="border-t border-gray-400 pt-1 text-xs text-gray-500">
                    Authorized Signature / School Seal
                </div>
            </div>
        </section>

        <footer class="mt-6 pt-4 border-t text-xs text-center text-gray-500">
            <p>This is a computer-generated receipt and does not require a physical signature.</p>
        </footer>
    </div>
</body>
</html>
  `;
}

async function generateReceiptPDF(receiptData) {
  let browser;
  try {
    console.log('Starting PDF generation...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const html = generateReceiptHTML(receiptData);
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      // MODIFIED: Reduced margins slightly to help fit content on one page
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });
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