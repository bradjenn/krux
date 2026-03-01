import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { FileText } from 'lucide-react'
import { FileTree, type TreeNode } from './FileTree'
import { DocViewer } from './DocViewer'

interface DocumentsTabProps {
  projectId: string
  projectPath: string
}

/** Convert the Rust read_dir_tree response to our TreeNode format */
interface RustTreeNode {
  name: string
  path: string
  type: string
  children?: RustTreeNode[]
}

function convertTree(nodes: RustTreeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    name: n.name,
    path: n.path,
    type: n.type as 'file' | 'dir',
    children: n.children ? convertTree(n.children) : undefined,
  }))
}

export default function DocumentsTab({ projectPath }: DocumentsTabProps) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  const planningPath = `${projectPath}/.planning`

  // Load file tree
  useEffect(() => {
    setTreeLoading(true)
    invoke<RustTreeNode[]>('read_dir_tree', { path: planningPath })
      .then((nodes) => {
        setTree(convertTree(nodes))
        setTreeLoading(false)
      })
      .catch(() => {
        setTree([])
        setTreeLoading(false)
      })
  }, [planningPath])

  // Load file content when selection changes
  useEffect(() => {
    if (!selectedFile || selectedFile.endsWith('/')) {
      setContent(null)
      return
    }

    setDocLoading(true)
    invoke<string>('read_file', { path: `${planningPath}/${selectedFile}` })
      .then((data) => {
        setContent(data)
        setDocLoading(false)
      })
      .catch(() => {
        setContent(null)
        setDocLoading(false)
      })
  }, [selectedFile, planningPath])

  return (
    <div className="flex h-full">
      {/* File tree panel */}
      <div
        className="w-[260px] flex-shrink-0 overflow-y-auto"
        style={{
          borderRight: '1px solid var(--border)',
          background: 'var(--bg2)',
        }}
      >
        {treeLoading ? (
          <div className="py-2 px-3 space-y-1.5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-4 rounded animate-pulse"
                style={{
                  background: 'var(--border)',
                  width: `${60 + Math.random() * 30}%`,
                }}
              />
            ))}
          </div>
        ) : (
          <FileTree nodes={tree} selectedPath={selectedFile} onSelect={setSelectedFile} />
        )}
      </div>

      {/* Document content panel */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Breadcrumb */}
        {selectedFile && (
          <div
            className="shrink-0 px-6 py-2 text-xs"
            style={{
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {selectedFile.split('/').map((segment, i, arr) => (
              <span key={i}>
                {i > 0 && <span style={{ color: 'var(--text-dim)' }}> / </span>}
                <span style={i === arr.length - 1 ? { color: 'var(--text)' } : undefined}>
                  {segment}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {selectedFile && !selectedFile.endsWith('/') ? (
            docLoading ? (
              <div className="space-y-3 max-w-4xl">
                <div className="h-8 w-2/3 rounded animate-pulse" style={{ background: 'var(--border)' }} />
                <div className="h-4 w-full rounded animate-pulse" style={{ background: 'var(--bg2)' }} />
                <div className="h-4 w-5/6 rounded animate-pulse" style={{ background: 'var(--bg2)' }} />
                <div className="h-4 w-4/5 rounded animate-pulse" style={{ background: 'var(--bg2)' }} />
              </div>
            ) : content ? (
              <DocViewer content={content} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>File not found</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a file from the tree</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
