const { contextBridge } = require('electron')
const { machineIdSync } = require('node-machine-id')

contextBridge.exposeInMainWorld('electronAPI', {
  getHWID: () => {
    try {
      return machineIdSync(true); // true = original machine ID, false = hash
    } catch (e) {
      // Fallback in case of error
      const os = require('os');
      return `${os.hostname()}-${os.platform()}`;
    }
  }
})
