const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { machineIdSync } = require('node-machine-id')
const os = require('os')

// Manejador IPC para obtener el HWID de forma segura en el proceso Main (Node.js)
ipcMain.handle('get-hwid', () => {
  try {
    return machineIdSync(true)
  } catch (e) {
    return `${os.hostname()}-${os.platform()}`
  }
})

// Mantener una referencia global del objeto window
let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: "Soberana ERP/POS",
    icon: path.join(__dirname, '../public/soberana.png')
  })

  // En desarrollo carga de Vite, en producción del build
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
