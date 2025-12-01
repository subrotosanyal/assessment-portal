import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Role = 'evaluator' | 'creator' | 'candidate'

type RoleContextValue = {
  role: Role
  setRole: (r: Role) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)
const defaultRole: Role = 'evaluator'

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('portal-role') : null
    if (saved === 'creator' || saved === 'evaluator' || saved === 'candidate') return saved
    return defaultRole
  })

  useEffect(() => {
    window.localStorage.setItem('portal-role', role)
  }, [role])

  const value = useMemo(() => ({ role, setRole }), [role])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}

export const ROLE_OPTIONS: { label: string; value: Role; helper?: string }[] = [
  { label: 'Evaluator', value: 'evaluator', helper: 'Grade and view submissions' },
  { label: 'Assignment creator', value: 'creator', helper: 'Manage and publish assignments' },
  { label: 'Candidate', value: 'candidate', helper: 'Draft a solution with in-browser editor' }
]
