const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.send('set-auto-launch', enabled),
  setWidgetMode: (enabled) => ipcRenderer.send('set-widget-mode', enabled),
  readStore: (key) => ipcRenderer.invoke('read-store', key),
  writeStore: (key, value) => ipcRenderer.send('write-store', key, value),
  deleteStore: (key) => ipcRenderer.send('delete-store', key),
  clearStore: () => ipcRenderer.send('clear-store'),
  saveBackup: () => ipcRenderer.invoke('save-backup'),
  setAlwaysOnTop: (enabled) => ipcRenderer.send('set-always-on-top', enabled),
  setIgnoreMouseEvents: (enabled) => ipcRenderer.send('set-ignore-mouse-events', enabled),
  onSettingsUpdated: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('settings-updated', subscription);
    return () => ipcRenderer.removeListener('settings-updated', subscription);
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
});
