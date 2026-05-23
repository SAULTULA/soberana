const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getHWID: () => {
    try {
      const { machineIdSync } = require('node-machine-id');
      return machineIdSync(true); // true = original machine ID, false = hash
    } catch (e) {
      // Fallback in case of error
      const os = require('os');
      return `${os.hostname()}-${os.platform()}`;
    }
  }
})
