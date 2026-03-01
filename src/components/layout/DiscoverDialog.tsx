import { useState } from 'react'
import { X, FolderSearch, Plus, Check } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore, type Project } from '../../stores/appStore'

interface DiscoverDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function DiscoverDialog({ isOpen, onClose }: DiscoverDialogProps) {
  const { projects, setProjects } = useAppStore()
  const [scanPath, setScanPath] = useState('~/Code')
  const [discovered, setDiscovered] = useState<{ name: string; path: string }[]>([])
  const [scanning, setScanning] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())

  if (!isOpen) return null

  const handleScan = async () => {
    setScanning(true)
    setAdded(new Set())
    try {
      const results = await invoke<{ name: string; path: string }[]>('discover_projects', {
        scanPath,
      })
      setDiscovered(results)
    } finally {
      setScanning(false)
    }
  }

  const handleAdd = async (d: { name: string; path: string }) => {
    const project = await invoke<Project>('add_project', {
      name: d.name,
      path: d.path,
    })
    setProjects([...projects, project])
    setAdded((prev) => new Set(prev).add(d.path))
  }

  const handleAddAll = async () => {
    for (const d of discovered) {
      if (!added.has(d.path)) {
        await handleAdd(d)
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: 'fade-in 0.15s ease' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)' }}
        onClick={onClose}
      />

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 460,
          maxHeight: '85vh',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          animation: 'scale-in 0.15s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <FolderSearch size={15} style={{ color: 'var(--accent2)' }} />
            <h2 className="font-semibold" style={{ fontSize: 15, color: 'var(--text)' }}>
              Discover Projects
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scan input */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <label
            className="block mb-2 uppercase tracking-wider font-medium"
            style={{ fontSize: 11, color: 'var(--text-muted)' }}
          >
            Scan Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              className="flex-1 px-3 py-2 rounded transition-colors"
              style={{
                fontSize: 13,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent2)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <button
              onClick={handleScan}
              className="px-4 py-2 rounded font-medium transition-all duration-150"
              style={{
                fontSize: 12,
                background: 'var(--accent)',
                color: 'var(--bg)',
                opacity: scanning ? 0.5 : 1,
              }}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
          {discovered.length > 0 && (
            <div className="px-5 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {discovered.length} project{discovered.length !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={handleAddAll}
                className="flex items-center gap-1 px-2 py-1 rounded transition-colors"
                style={{ fontSize: 11, color: 'var(--accent)' }}
              >
                <Plus size={11} />
                Add all
              </button>
            </div>
          )}

          {discovered.map((d) => {
            const isAdded = added.has(d.path)
            return (
              <button
                key={d.path}
                onClick={() => !isAdded && handleAdd(d)}
                className="flex items-center gap-3 w-full text-left transition-all duration-100"
                style={{
                  padding: '10px 20px',
                  opacity: isAdded ? 0.5 : 1,
                  cursor: isAdded ? 'default' : 'pointer',
                  borderBottom: '1px solid rgba(10,42,74,0.5)',
                }}
                onMouseEnter={(e) => {
                  if (!isAdded) e.currentTarget.style.background = 'rgba(15,197,237,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {isAdded ? (
                  <Check size={14} style={{ color: 'var(--green)', shrink: 0 }} />
                ) : (
                  <Plus size={14} style={{ color: 'var(--text-dim)', shrink: 0 }} />
                )}
                <div className="min-w-0">
                  <div className="truncate" style={{ fontSize: 13, color: 'var(--text)' }}>
                    {d.name}
                  </div>
                  <div className="truncate" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {d.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                </div>
              </button>
            )
          })}

          {discovered.length === 0 && !scanning && (
            <div className="px-5 py-8 text-center" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Enter a directory path and click Scan
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded transition-all duration-150"
            style={{ fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
