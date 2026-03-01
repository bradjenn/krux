import XTerminal from './components/terminal/XTerminal'

export default function App() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          cc-manager
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <XTerminal projectPath={import.meta.env.DEV ? '/Users/bradley/Code' : '~'} />
      </div>
    </div>
  )
}
