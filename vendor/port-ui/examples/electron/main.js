// Electron main process: frameless window that matches Port's chrome on every OS.
const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("node:path");

function createWindow() {
  const isMac = process.platform === "darwin";
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    frame: isMac,                                  // macOS keeps native traffic lights…
    titleBarStyle: isMac ? "hiddenInset" : "hidden", // …inset into Port's titlebar (Port leaves 84px for them)
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#131719" : "#f1eee7", // surface-0, avoids a white flash
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
  ipcMain.on("port:window", (_e, action) => {
    if (action === "minimize") win.minimize();
    if (action === "maximize") (win.isMaximized() ? win.unmaximize() : win.maximize());
    if (action === "close") win.close();
  });
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
