import { useState, useEffect } from 'react'

const THINKING_VERBS = [
  'Thinking',
  'Reasoning',
  'Analyzing',
  'Considering',
  'Processing',
  'Reflecting',
  'Evaluating',
  'Pondering',
]

export default function ThinkingIndicator() {
  const [verbIndex, setVerbIndex] = useState(
    () => Math.floor(Math.random() * THINKING_VERBS.length),
  )
  const [dots, setDots] = useState(1)

  // Cycle through verbs every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbIndex((i) => (i + 1) % THINKING_VERBS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Animate dots every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d % 3) + 1)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const verb = THINKING_VERBS[verbIndex]

  return (
    <div className="py-3">
      <div className="text-dim text-[10px] uppercase tracking-wider font-medium mb-1.5">
        Claude
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 items-center">
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDuration: '1s', animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDuration: '1s', animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDuration: '1s', animationDelay: '300ms' }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {verb}
          {'.'.repeat(dots)}
        </span>
      </div>
    </div>
  )
}
