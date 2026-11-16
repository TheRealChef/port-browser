// Exposes window controls to Port's .wctl buttons (Windows/Linux).
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("portWindow", {
  minimize: () => ipcRenderer.send("port:window", "minimize"),
  maximize: () => ipcRenderer.send("port:window", "maximize"),
  close: () => ipcRenderer.send("port:window", "close"),
  platform: process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux",
});
