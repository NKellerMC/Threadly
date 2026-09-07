import { Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { VideoPost } from '../lib/types'
import { formatCompact } from '../lib/time'

export default function VideoGrid({ videos }: { videos: VideoPost[] }) {
  const navigate = useNavigate()
  return <div className="profile-grid">{videos.map(video => <button key={video.id} className="grid-video" onClick={()=>navigate(`/watch/${video.id}`)}>{video.thumbnailUrl?<img src={video.thumbnailUrl} alt="" loading="lazy"/>:<video src={video.videoUrl} muted preload="metadata"/>}<span><Play size={13} fill="currentColor"/> {formatCompact(video.views)}</span></button>)}</div>
}
