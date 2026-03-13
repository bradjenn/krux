import { invoke } from '@tauri-apps/api/core'
import { Folder } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function ProjectFavicon({
  projectPath,
  size = 15,
}: {
  projectPath: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    invoke<string | null>('find_project_favicon', { projectPath }).then((dataUrl) => {
      if (dataUrl) setSrc(dataUrl)
      else setStatus('error')
    })
  }, [projectPath])

  if (status === 'error' || !src) {
    return <Folder size={size} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
  }

  return (
    <img
      src={src}
      alt=""
      className={cn('shrink-0 rounded-sm object-contain', status === 'loading' && 'hidden')}
      style={{ width: size, height: size }}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
    />
  )
}
