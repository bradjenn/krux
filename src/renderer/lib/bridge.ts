/**
 * IPC bridge — abstracts the preload API exposed on `window.krux`.
 * All renderer IPC goes through this module.
 */

interface KruxAPI {
  invoke: <T = unknown>(channel: string, args?: Record<string, unknown>) => Promise<T>
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  once: (channel: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    krux: KruxAPI
  }
}

/**
 * Invoke a main-process handler and return the result.
 */
export async function invoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return window.krux.invoke<T>(command, args)
}

/**
 * Listen for events emitted by the main process.
 * Returns an unlisten function. The callback receives the payload directly.
 */
export type UnlistenFn = () => void

export function listen<T = unknown>(
  event: string,
  callback: (payload: T) => void,
): UnlistenFn {
  return window.krux.on(event, (payload) => {
    callback(payload as T)
  })
}

/**
 * Convert a local file path to a URL the renderer can load.
 * Uses the krux-file:// custom protocol registered in main/index.ts.
 */
export function convertFileSrc(filePath: string): string {
  return `krux-file://${encodeURIComponent(filePath)}`
}
