const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize:      () => ipcRenderer.send('window:minimize'),
    maximize:      () => ipcRenderer.send('window:maximize'),
    close:         () => ipcRenderer.send('window:close'),
    isMaximized:   () => ipcRenderer.invoke('window:is-maximized'),
    onStateChanged: (cb) => {
      ipcRenderer.on('window:state-changed', (_event, isMaximized) => cb(isMaximized))
      return () => ipcRenderer.removeAllListeners('window:state-changed')
    },
  },
  screen: {
    takeScreenshot:      () => ipcRenderer.invoke('get-screenshot'),
    getIdleTime:         () => ipcRenderer.invoke('get-idle-time'),
    getActiveWindowName: () => ipcRenderer.invoke('get-active-window'),
  },
  shift: {
    // Notify main process so the tray stays in sync
    started:   (data)   => ipcRenderer.send('shift:started', data),
    stopped:   ()       => ipcRenderer.send('shift:stopped'),
    paused:    ()       => ipcRenderer.send('shift:paused'),
    resumed:   ()       => ipcRenderer.send('shift:resumed'),
    syncTime:  (data)   => ipcRenderer.send('shift:sync-time', data),
  },
  sendNotification: (payload) => ipcRenderer.send('notification:send', payload),

  // ─── Auto Updater ────────────────────────────────────────────────────────
  updater: {
    onUpdateAvailable:  (cb) => ipcRenderer.on('updater:update-available',  (_e, info) => cb(info)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('updater:update-downloaded', (_e, info) => cb(info)),
    installNow:         ()   => ipcRenderer.send('updater:install-now'),
  },
})
