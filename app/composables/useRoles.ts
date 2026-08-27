// composables/useRoles.ts
// Roles allowed into the MASTER ADMIN portal (admin.passmed.com).
// institution-admin belongs to the institute portal only; professor has no admin access.
export const ALLOWED_ROLES = [
  'admin',
  'super-admin',
  'support-admin',
  'content-admin',
]

export function getIsAllowedRole(role?: string): boolean {
  if (!role) return false
  return ALLOWED_ROLES.includes(role)
}