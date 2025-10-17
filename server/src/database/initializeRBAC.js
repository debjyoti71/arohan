const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const { PREDEFINED_ROLES, ALL_PERMISSIONS } = require('../utils/permissions');

const initializeRBAC = async () => {
  try {
    console.log('Initializing RBAC system...');

    // Initialize permissions
    console.log('Creating permissions...');
    for (const permission of ALL_PERMISSIONS) {
      await Permission.findOneAndUpdate(
        { resource: permission.resource, action: permission.action },
        permission,
        { upsert: true, new: true }
      );
    }
    console.log(`Created/updated ${ALL_PERMISSIONS.length} permissions`);

    // Initialize predefined roles
    console.log('Creating predefined roles...');
    for (const [roleKey, roleData] of Object.entries(PREDEFINED_ROLES)) {
      await Role.findOneAndUpdate(
        { name: roleKey },
        {
          name: roleKey,
          permissions: Object.entries(roleData.permissions).map(([resource, actions]) => ({
            resource,
            actions
          })),
          isSystem: true
        },
        { upsert: true, new: true }
      );
    }
    console.log(`Created/updated ${Object.keys(PREDEFINED_ROLES).length} predefined roles`);

    // Update existing users with new permission structure
    console.log('Updating existing users...');
    const users = await User.find({});
    for (const user of users) {
      if (user.role !== 'custom' && PREDEFINED_ROLES[user.role]) {
        await User.findByIdAndUpdate(user._id, {
          permissions: PREDEFINED_ROLES[user.role].permissions
        });
      }
    }
    console.log(`Updated ${users.length} users`);

    console.log('RBAC initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing RBAC:', error);
    throw error;
  }
};

module.exports = initializeRBAC;

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arohan')
    .then(() => {
      console.log('Connected to MongoDB');
      return initializeRBAC();
    })
    .then(() => {
      console.log('RBAC initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}