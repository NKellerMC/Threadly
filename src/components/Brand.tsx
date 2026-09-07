export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Threadly">
      <div className="brand-mark" aria-hidden="true"><span /><span /></div>
      {!compact && <span className="brand-word">Threadly</span>}
    </div>
  )
}
