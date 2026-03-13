import { contextBridge, ipcRenderer } from 'electron'

export interface KruxAPI {
  invoke: <T = unknown>(channel: string, args?: Record<string, unknown>) => Promise<T>
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  once: (channel: string, callback: (...args: unknown[]) => void) => void
}

const api: KruxAPI = {
  /**
   * Send a request to the main process and await a response.
   * Maps to `ipcRenderer.invoke(channel, args)`.
   */
  invoke: <T = unknown>(channel: string, args?: Record<string, unknown>): Promise<T> => {
    return ipcRenderer.invoke(channel, args) as Promise<T>
  },

  /**
   * Subscribe to events from the main process.
   * Returns an unlisten function.
   */
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },

  /**
   * Subscribe to a single event from the main process.
   */
  once: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipcRenderer.once(channel, (_event, ...args) => {
      callback(...args)
    })
  },
}

contextBridge.exposeInMainWorld('krux', api)
