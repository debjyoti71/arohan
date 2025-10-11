module.exports = {
  // Day of month when salaries are marked as unpaid (1-31)
  salaryResetDay: 1,
  
  // Current salary month/year tracking
  getCurrentSalaryPeriod: () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear()
    };
  }
};