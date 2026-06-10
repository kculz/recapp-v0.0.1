const STAFF_ROLES = ['Admin', 'SuperAdmin', 'Counselor'] as const;
const ADMIN_ROLES = ['Admin', 'SuperAdmin'] as const;

export const isStaffRole = (role?: string | null) => {
  if (!role) {
    return false;
  }

  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
};

export const isAdminRole = (role?: string | null) => {
  if (!role) {
    return false;
  }

  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
};

export const getPostLoginRoute = (role?: string | null) => (isStaffRole(role) ? '/(staff)/dashboard' : '/');
