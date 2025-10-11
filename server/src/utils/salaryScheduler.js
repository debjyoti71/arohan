const cron = require('node-cron');
const salaryConfig = require('../../config/salary');

// Schedule to run daily at midnight to check if salary status should reset
const initSalaryScheduler = () => {
  cron.schedule('0 0 * * *', () => {
    const now = new Date();
    const resetDay = salaryConfig.salaryResetDay;
    
    if (now.getDate() === resetDay) {
      console.log(`Salary status reset triggered on day ${resetDay} of month ${now.getMonth() + 1}`);
      // Salary status is automatically handled by checking current period in API calls
      // No database updates needed as we check transaction existence dynamically
    }
  });
  
  console.log(`Salary scheduler initialized. Salaries will be marked unpaid on day ${salaryConfig.salaryResetDay} of each month.`);
};

module.exports = { initSalaryScheduler };