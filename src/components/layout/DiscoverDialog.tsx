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
import { cn } from '@/lib/utils'
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
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ background: 'rgba(15,197,237,0.08)', border: '1px solid rgba(15,197,237,0.15)' }}
            >
              <HugeiconsIcon icon={FolderSearchIcon} size={15} strokeWidth={1.5} className="text-secondary" />
            </div>
            <div>
              <DialogTitle>Discover Projects</DialogTitle>
              <DialogDescription>Scan a directory for project folders</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scan input */}
        <div className="px-6 py-5 border-b border-border">
          <label className="block mb-3 text-xs font-medium text-muted-foreground">
            Scan Directory
          </label>
          <div className="flex gap-2.5">
            <Input
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleScan} disabled={scanning} className="rounded-lg">
              {scanning ? 'Scanning...' : 'Scan'}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 300px)' }}>
          {discovered.length > 0 && (
            <div
              className="px-6 py-3 flex items-center justify-between border-b border-border"
            >
              <span className="text-[11px] text-muted-foreground">
                {discovered.length} project{discovered.length !== 1 ? 's' : ''} found
              </span>
              <Button variant="ghost" size="sm" onClick={handleAddAll} className="text-primary text-[11px]">
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
                className={cn(
                  "flex items-center gap-3 w-full text-left transition-all duration-100",
                  isAdded ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-secondary/[0.05]'
                )}
                style={{
                  padding: '10px 24px',
                  borderBottom: '1px solid rgba(10,42,74,0.5)',
                }}
              >
                {isAdded ? (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={1.5} className="shrink-0 text-green-500" />
                ) : (
                  <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.5} className="shrink-0 text-dim" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-foreground">{d.name}</div>
                  <div className="truncate text-[11px] text-dim" style={{ marginTop: 1 }}>
                    {d.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                </div>
              </div>
            )
          })}

          {discovered.length === 0 && !scanning && (
            <div className="px-6 py-10 text-center text-xs text-dim">
              Enter a directory path and click Scan
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
