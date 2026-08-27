import { useAuthStore } from '@/stores/auth';

/**
 * Admin-panel permissions.
 *
 * The backend attaches a `permissions` map to the user on /login and /me:
 *
 *   { users: 'edit', question_bank: 'full', payments: 'none', … }
 *
 * Levels are ordered  none < view < edit < full.  The SAME map is enforced
 * server-side by the `perm:<area>,<level>` middleware on /api/v1/* — hiding a
 * nav item is UX, not the security boundary.
 *
 * Two bugs fixed here:
 *   • the old routePermissionMap pointed at areas that no longer matched the
 *     panel (`/dashboard/exams` → 'question_bank', `/dashboard/settings` →
 *     'security') and covered only 6 of ~20 screens;
 *   • the super-admin bypass compared `auth.user?.isAdmin === '1'` — a string
 *     compare that silently failed whenever the API returned a numeric 1.
 */

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full'

export const PERMISSION_LEVELS: PermissionLevel[] = ['none', 'view', 'edit', 'full']

export const ADMIN_AREAS = [
  'users',
  'question_bank',
  'exams',
  'institutions',
  'payments',
  'content',
  'notifications',
  'analytics',
  'support',
  'settings',
] as const

export type AdminArea = typeof ADMIN_AREAS[number]

/**
 * Route prefix → area. Longest / most specific first: /dashboard/exams/category
 * must resolve to `exams`, and /dashboard/notification-templates must not be
 * swallowed by /dashboard/notifications.
 */
export const ROUTE_PERMISSION_MAP: Array<{ prefix: string; area: AdminArea }> = [
  { prefix: '/dashboard/users',                  area: 'users' },

  { prefix: '/dashboard/questions',              area: 'question_bank' },
  { prefix: '/dashboard/import-conflict-review', area: 'question_bank' },
  { prefix: '/dashboard/category',               area: 'question_bank' },
  { prefix: '/dashboard/domain',                 area: 'question_bank' },
  { prefix: '/dashboard/discipline',             area: 'question_bank' },
  { prefix: '/dashboard/subject',                area: 'question_bank' },
  { prefix: '/dashboard/tags',                   area: 'question_bank' },
  { prefix: '/dashboard/learning-outcome',       area: 'question_bank' },
  { prefix: '/dashboard/difficulty',             area: 'question_bank' },

  { prefix: '/dashboard/exams',                  area: 'exams' },

  { prefix: '/dashboard/institutions',           area: 'institutions' },

  { prefix: '/dashboard/payments',               area: 'payments' },
  { prefix: '/dashboard/refund',                 area: 'payments' },
  { prefix: '/dashboard/promos',                 area: 'payments' },

  { prefix: '/dashboard/pages',                  area: 'content' },
  { prefix: '/dashboard/faqs',                   area: 'content' },
  { prefix: '/dashboard/portal-student-faqs',    area: 'content' },
  { prefix: '/dashboard/portal-institute-faqs',  area: 'content' },

  { prefix: '/dashboard/notification-templates', area: 'notifications' },
  { prefix: '/dashboard/notifications',          area: 'notifications' },

  { prefix: '/dashboard/analytics',              area: 'analytics' },

  { prefix: '/dashboard/support-flags',          area: 'support' },

  { prefix: '/dashboard/settings',               area: 'settings' },
]

/** Pages any admin may open regardless of the matrix (landing + own profile). */
// Ungated admin paths — reachable by any signed-in admin regardless of area matrix.
// /dashboard/search is here on purpose: global search spans every area, and the
// results are already permission-filtered per group by the backend, so the page
// itself must not be gated on any single area.
export const ADMIN_PUBLIC_PATHS = ['/dashboard', '/dashboard/profile', '/dashboard/search']

/** Which area guards this admin path? `null` = ungated. */
export function areaForAdminPath (path: string): AdminArea | null {
  const clean = String(path || '').split('?')[0]!.replace(/\/+$/, '') || '/dashboard'
  if (ADMIN_PUBLIC_PATHS.includes(clean)) return null

  const hit = ROUTE_PERMISSION_MAP.find(p => clean === p.prefix || clean.startsWith(p.prefix + '/'))
  return hit ? hit.area : null
}

/** Super Admin bypasses the matrix entirely — it can never lock itself out. */
function isSuperAdmin (user: any): boolean {
  return String(user?.role || '').toLowerCase() === 'super-admin'
}

export function levelForArea (area: string): PermissionLevel {
  const auth = useAuthStore()
  if (isSuperAdmin(auth.user)) return 'full'

  const raw = String((auth.user as any)?.permissions?.[area] ?? 'none').toLowerCase()
  return (PERMISSION_LEVELS as string[]).includes(raw) ? (raw as PermissionLevel) : 'none'
}

/** At least `view` on this area — may I see it at all? */
export function can (area: string, required: PermissionLevel = 'view'): boolean {
  const have = PERMISSION_LEVELS.indexOf(levelForArea(area))
  const need = PERMISSION_LEVELS.indexOf(required)
  return have >= (need < 0 ? 1 : need)
}

/** At least `edit` — may I change anything here? */
export const canEdit = (area: string): boolean => can(area, 'edit')

/** Exactly `full`. */
export const canFull = (area: string): boolean => can(area, 'full')

/** Visible but not editable — drives disabled buttons / hidden actions. */
export const isReadOnly = (area: string): boolean => can(area, 'view') && !can(area, 'edit')

/** May this user open this admin path? */
export function canVisitAdminPath (path: string): boolean {
  const area = areaForAdminPath(path)
  if (!area) return true
  return can(area, 'view')
}

/** First admin page the user may actually open — used for redirects. */
export function firstAllowedAdminPath (): string {
  const hit = ROUTE_PERMISSION_MAP.find(p => can(p.area, 'view'))
  return hit ? hit.prefix : '/dashboard'
}

/* ── Back-compat ────────────────────────────────────────────────────────────
 * The original API took a LEVEL value rather than an area name, and is still
 * called from a few components. Kept working; prefer can()/canEdit()/canFull().
 */
export const routePermissionMap: Record<string, string> = Object.fromEntries(
  ROUTE_PERMISSION_MAP.map(r => [r.prefix, r.area]),
)

export const canAccess = (value?: any): boolean => {
  const auth = useAuthStore()
  if (isSuperAdmin(auth.user)) return true
  return !!value && value !== 'none'
}

export const isEdit = (value?: string): boolean => {
  const auth = useAuthStore()
  if (isSuperAdmin(auth.user)) return true
  return value === 'edit' || value === 'full'
}

export const isFull = (value?: any): boolean => {
  const auth = useAuthStore()
  if (isSuperAdmin(auth.user)) return true
  return value === 'full'
}
