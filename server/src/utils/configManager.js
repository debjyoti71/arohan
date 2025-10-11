const fs = require('fs');
const path = require('path');

class ConfigManager {
  static getConfigPath() {
    return path.join(__dirname, '../../config/fees.js');
  }

  static async updateFeeConfig(updates) {
    try {
      const configPath = this.getConfigPath();
      const currentConfig = require('../../config/fees');
      
      // Deep merge updates with current config
      const newConfig = this.deepMerge(currentConfig, updates);
      
      // Generate new config file content
      const configContent = `module.exports = ${JSON.stringify(newConfig, null, 2)};`;
      
      // Write to file
      fs.writeFileSync(configPath, configContent);
      
      // Clear require cache to reload config
      delete require.cache[require.resolve('../../config/fees')];
      
      return newConfig;
    } catch (error) {
      console.error('Error updating fee config:', error);
      throw error;
    }
  }

  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  static validateConfig(config) {
    const required = ['academicYear', 'recalculationSchedule', 'frequencies'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
    
    // Validate recalculation schedule
    const schedule = config.recalculationSchedule;
    if (schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
      throw new Error('dayOfMonth must be between 1 and 31');
    }
    
    if (schedule.hour < 0 || schedule.hour > 23) {
      throw new Error('hour must be between 0 and 23');
    }
    
    return true;
  }
}

module.exports = ConfigManager;