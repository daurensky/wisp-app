import { ipcMain, desktopCapturer, app, BrowserWindow, session } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const state = {
  screenShareSourceId: null
};
ipcMain.handle("set-desktop-capturer-source", (_, screenShareSourceId) => {
  state.screenShareSourceId = screenShareSourceId;
});
ipcMain.handle("get-desktop-capturers", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
    thumbnailSize: { width: 1280, height: 720 }
  });
  const sorted = sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  })).sort((a, b) => a.name > b.name ? 1 : -1);
  return {
    window: sorted.filter(({ id }) => id.startsWith("window:")),
    screen: sorted.filter(({ id }) => id.startsWith("screen:"))
  };
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    width: 1920,
    height: 1080
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
      const source = sources.find(
        ({ id }) => id === state.screenShareSourceId
      );
      if (!source) {
        throw new Error(`Source not found: ${state.screenShareSourceId}`);
      }
      callback({ video: source, audio: "loopback" });
    });
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
