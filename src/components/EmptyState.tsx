import type { ReactNode } from 'react'

export default function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-icon">{icon}</div>}<h3>{title}</h3>{children && <p>{children}</p>}</div>
}
