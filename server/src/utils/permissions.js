const PREDEFINED_ROLES = {
  admin: {
    name: 'Administrator',
    permissions: {
      dashboard: ['read'],
      users: ['create', 'read', 'update', 'delete'],
      students: ['create', 'read', 'update', 'delete'],
      staff: ['create', 'read', 'update', 'delete'],
      classes: ['create', 'read', 'update', 'delete'],
      fees: ['create', 'read', 'update', 'delete'],
      finance: ['create', 'read', 'update', 'delete'],
      configuration: ['create', 'read', 'update', 'delete']
    }
  },
  principal: {
    name: 'Principal',
    permissions: {
      classes: ['create', 'read', 'update', 'delete'],
      fees: ['create', 'read', 'update', 'delete'],
      staff: ['create', 'read', 'update', 'delete'],
      students: ['create', 'read', 'update', 'delete'],
      finance: ['create', 'read', 'update'] // exclude monthly income stats
    }
  },
  staff: {
    name: 'Staff',
    permissions: {
      students: ['create', 'read', 'update', 'delete'],
      classes: ['read'],
      fees: ['create', 'read', 'update'] // fee collection only
    }
  }
};

const ALL_PERMISSIONS = [
  { resource: 'dashboard', action: 'read', description: 'View dashboard' },
  { resource: 'users', action: 'create', description: 'Create users' },
  { resource: 'users', action: 'read', description: 'View users' },
  { resource: 'users', action: 'update', description: 'Update users' },
  { resource: 'users', action: 'delete', description: 'Delete users' },
  { resource: 'students', action: 'create', description: 'Create students' },
  { resource: 'students', action: 'read', description: 'View students' },
  { resource: 'students', action: 'update', description: 'Update students' },
  { resource: 'students', action: 'delete', description: 'Delete students' },
  { resource: 'staff', action: 'create', description: 'Create staff' },
  { resource: 'staff', action: 'read', description: 'View staff' },
  { resource: 'staff', action: 'update', description: 'Update staff' },
  { resource: 'staff', action: 'delete', description: 'Delete staff' },
  { resource: 'classes', action: 'create', description: 'Create classes' },
  { resource: 'classes', action: 'read', description: 'View classes' },
  { resource: 'classes', action: 'update', description: 'Update classes' },
  { resource: 'classes', action: 'delete', description: 'Delete classes' },
  { resource: 'fees', action: 'create', description: 'Create fees' },
  { resource: 'fees', action: 'read', description: 'View fees' },
  { resource: 'fees', action: 'update', description: 'Update fees' },
  { resource: 'fees', action: 'delete', description: 'Delete fees' },
  { resource: 'finance', action: 'create', description: 'Create financial records' },
  { resource: 'finance', action: 'read', description: 'View financial records' },
  { resource: 'finance', action: 'update', description: 'Update financial records' },
  { resource: 'finance', action: 'delete', description: 'Delete financial records' },
  { resource: 'configuration', action: 'create', description: 'Create configurations' },
  { resource: 'configuration', action: 'read', description: 'View configurations' },
  { resource: 'configuration', action: 'update', description: 'Update configurations' },
  { resource: 'configuration', action: 'delete', description: 'Delete configurations' }
];

const hasPermission = (userPermissions, resource, action) => {
  return userPermissions[resource] && userPermissions[resource].includes(action);
};

const formatPermissionsForUser = (permissions) => {
  const formatted = {};
  permissions.forEach(perm => {
    if (!formatted[perm.resource]) {
      formatted[perm.resource] = [];
    }
    formatted[perm.resource].push(perm.action);
  });
  return formatted;
};

module.exports = {
  PREDEFINED_ROLES,
  ALL_PERMISSIONS,
  hasPermission,
  formatPermissionsForUser
};