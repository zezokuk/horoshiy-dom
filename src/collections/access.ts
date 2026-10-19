import type { Access, FieldAccess, Where } from 'payload'

/**
 * Roles of the client's team:
 *   admin   — everything, including regions, company settings and staff;
 *   content — the content maker: houses, estates, projects, photos and videos, promos, promo pages; no leads, no settings;
 *   sales   — the sales head (РОП): leads and their statuses, house statuses; no deleting, no settings;
 *   manager — a regional manager: houses, estates, promos and leads of the regions assigned to him.
 */
export type Role = 'admin' | 'content' | 'sales' | 'manager'
type Staff = { id: number | string; role?: Role | null; regions?: (number | string | { id: number | string })[] | null }

const roleOf = (user: unknown) => (user as Staff | null)?.role ?? null
export const isAdmin = (user: unknown): boolean => roleOf(user) === 'admin'
export const isStaff = (user: unknown): boolean => Boolean(user)
export const hasRole = (user: unknown, ...roles: Role[]) => roles.includes(roleOf(user) as Role)

const regionIds = (user: Staff) => (user.regions || []).map((r) => (typeof r === 'object' ? r.id : r))

export const anyone: Access = () => true
export const staffOnly: Access = ({ req }) => isStaff(req.user)
export const adminOnly: Access = ({ req }) => isAdmin(req.user)
export const staffField: FieldAccess = ({ req }) => isStaff(req.user)

/** Admins and the listed roles: everything; nobody else. */
export const roles =
  (...allowed: Role[]): Access =>
  ({ req }) =>
    isAdmin(req.user) || hasRole(req.user, ...allowed)

/** Admins and the listed company-wide roles: all documents. Regional managers: only documents whose `field` points
 *  to one of their regions. Everyone else: nothing. */
export const inMyRegions =
  (field: string, ...wide: Role[]): Access =>
  ({ req }) => {
    const user = req.user as Staff | null
    if (!user) return false
    if (isAdmin(user) || hasRole(user, ...wide)) return true
    if (hasRole(user, 'manager')) return { [field]: { in: regionIds(user) } } as Where
    return false
  }

/** Hide a section of the admin menu from everyone but admins (regions, staff, company settings). */
export const adminOnlyInMenu = ({ user }: { user: unknown }) => !isAdmin(user)
