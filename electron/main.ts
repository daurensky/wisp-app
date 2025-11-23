import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const state: {
  screenShareSourceId: string | null
} = {
  screenShareSourceId: null,
}

ipcMain.handle(
  'set-desktop-capturer-source',
  (_, screenShareSourceId: string) => {
    state.screenShareSourceId = screenShareSourceId
  }
)

ipcMain.handle('get-desktop-capturers', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 1280, height: 720 },
  })

  const sorted = sources
    .map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }))
    .sort((a, b) => (a.name > b.name ? 1 : -1))

  return {
    window: sorted.filter(({ id }) => id.startsWith('window:')),
    screen: sorted.filter(({ id }) => id.startsWith('screen:')),
  }
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function addDisplayMediaRequestHandler() {
  session.defaultSession.setDisplayMediaRequestHandler((_, callback) => {
    desktopCapturer
      .getSources({ types: ['screen', 'window'] })
      .then(sources => {
        const source = sources.find(
          ({ id }) => id === state.screenShareSourceId
        )

        if (!source) {
          throw new Error(`Source not found: ${state.screenShareSourceId}`)
        }

        callback({ video: source, audio: 'loopback' })
      })
  })
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    width: 1920,
    height: 1080,
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.commandLine.appendSwitch(
  'enable-features',
  [
    'WebRTCHWEncoding',
    'WebRTCHWH264Encoding',
    'VaapiVideoEncoder',
    'VaapiVideoDecoder',
    'RTCVideoEncoderNVENC',
  ].join(',')
)
app.commandLine.appendSwitch('force_high_performance_gpu')

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  addDisplayMediaRequestHandler()
  createWindow()
})
