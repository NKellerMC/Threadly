export default function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const letter = name.trim().charAt(0).toUpperCase() || 'T'
  return (
    <div className={`avatar avatar-${size}`}>
      {src ? <img src={src} alt="" /> : <span>{letter}</span>}
    </div>
  )
}
