module.exports = {
  // Academic year settings
  academicYear: {
    startMonth: 4, // April
    endMonth: 3,   // March (next year)
  },

  // Auto fee generation schedule
  autoGeneration: {
    enabled: true,
    dayOfMonth: 1,    // 1st of every month
    hour: 0,          // Midnight
    minute: 0,
  },

  // Payment frequencies and their configurations
  frequencies: {
    monthly: {
      label: 'Monthly',
      periodsPerYear: 12,
      dueDayOfMonth: 5,  // 5th of every month
    },
    quarterly: {
      label: 'Quarterly', 
      periodsPerYear: 4,
      dueDayOfMonth: 5,  // 5th of quarter start month
      dueMonths: [4, 7, 10, 1], // Apr, Jul, Oct, Jan
    },
    biannual: {
      label: 'Bi-Annual',
      periodsPerYear: 2,
      dueDayOfMonth: 5,
      dueMonths: [4, 10], // Apr, Oct
    },
    yearly: {
      label: 'Yearly',
      periodsPerYear: 1,
      dueDayOfMonth: 5,
      dueMonths: [4], // April
    },
  },

  // Grace period settings
  gracePeriod: {
    days: 10, // Days after due date before marking overdue
  },

  // Default fee types
  defaultFeeTypes: [
    { name: 'Tuition Fee', isCore: true },
    { name: 'Transport Fee', isCore: false },
    { name: 'Library Fee', isCore: false },
    { name: 'Sports Fee', isCore: false },
    { name: 'Exam Fee', isCore: false },
  ],
};