import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { FolderSearchIcon, PlusSignIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { invoke } from '@tauri-apps/api/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore, type Project } from '@/stores/appStore'

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <HugeiconsIcon icon={FolderSearchIcon} size={16} strokeWidth={1.5} color="var(--accent2)" />
          <DialogTitle>Discover Projects</DialogTitle>
          <DialogDescription>Scan a directory for project folders</DialogDescription>
        </DialogHeader>

        {/* Scan input */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <label className="block mb-2 uppercase tracking-wide font-medium text-[11px] text-[var(--text-muted)]">
            Scan Directory
          </label>
          <div className="flex gap-2">
            <Input
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleScan} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Scan'}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 260px)' }}>
          {discovered.length > 0 && (
            <div
              className="px-5 py-2 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[11px] text-[var(--text-muted)]">
                {discovered.length} project{discovered.length !== 1 ? 's' : ''} found
              </span>
              <Button variant="ghost" size="sm" onClick={handleAddAll} className="text-[var(--accent)]">
                <HugeiconsIcon icon={PlusSignIcon} size={11} strokeWidth={2} />
                Add all
              </Button>
            </div>
          )}

          {discovered.map((d) => {
            const isAdded = added.has(d.path)
            return (
              <div
                key={d.path}
                role="button"
                tabIndex={0}
                onClick={() => !isAdded && handleAdd(d)}
                onKeyDown={(e) => e.key === 'Enter' && !isAdded && handleAdd(d)}
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
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={1.5} color="var(--green)" className="shrink-0" />
                ) : (
                  <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.5} color="var(--text-dim)" className="shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-[var(--text)]">{d.name}</div>
                  <div className="truncate text-[11px] text-[var(--text-dim)]">
                    {d.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                </div>
              </div>
            )
          })}

          {discovered.length === 0 && !scanning && (
            <div className="px-5 py-8 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
              Enter a directory path and click Scan
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
