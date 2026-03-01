import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
}

interface TreeItemProps {
  node: TreeNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
}

function TreeItem({ node, depth, selectedPath, onSelect }: TreeItemProps) {
  const [open, setOpen] = useState(depth === 0)
  const isSelected = selectedPath === node.path
  const indentPx = depth * 12

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 w-full text-left px-2 py-0.5 transition-colors duration-100"
          style={{
            paddingLeft: `${8 + indentPx}px`,
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {open ? (
            <ChevronDown size={12} className="shrink-0 opacity-60" />
          ) : (
            <ChevronRight size={12} className="shrink-0 opacity-60" />
          )}
          <Folder size={12} className="shrink-0 opacity-60 ml-0.5" />
          <span className="truncate ml-1">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className="flex items-center gap-1 w-full text-left px-2 py-0.5 transition-colors duration-100"
      style={{
        paddingLeft: `${8 + indentPx}px`,
        color: isSelected ? 'var(--accent)' : 'var(--text)',
        fontSize: 12,
        background: isSelected ? 'rgba(255,255,255,0.04)' : undefined,
        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = ''
      }}
    >
      <FileText size={12} className="shrink-0 opacity-50 ml-3.5" />
      <span className="truncate flex-1 ml-1">{node.name}</span>
    </button>
  )
}

export function FileTree({
  nodes,
  selectedPath,
  onSelect,
}: {
  nodes: TreeNode[]
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  return (
    <div className="py-2">
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  )
}
