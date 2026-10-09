import type { Access, FieldAccess, Where } from 'payload'

// Roles: admin sees everything; a regional manager only the regions assigned to him (houses, estates, leads).
type Staff = { id: number | string; role?: 'admin' | 'manager' | null; regions?: (number | string | { id: number | string })[] | null }

export const isAdmin = (user: unknown): boolean => (user as Staff | null)?.role === 'admin'
export const isStaff = (user: unknown): boolean => Boolean(user)

const regionIds = (user: Staff) => (user.regions || []).map((r) => (typeof r === 'object' ? r.id : r))

export const anyone: Access = () => true
export const staffOnly: Access = ({ req }) => isStaff(req.user)
export const adminOnly: Access = ({ req }) => isAdmin(req.user)
export const staffField: FieldAccess = ({ req }) => isStaff(req.user)

/** Admins: all documents. Managers: only documents whose `field` points to one of their regions. */
export const inMyRegions =
  (field: string): Access =>
  ({ req }) => {
    const user = req.user as Staff | null
    if (!user) return false
    if (isAdmin(user)) return true
    return { [field]: { in: regionIds(user) } } as Where
  }
