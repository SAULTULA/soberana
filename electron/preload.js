const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getHWID: () => ipcRenderer.invoke('get-hwid')
})
