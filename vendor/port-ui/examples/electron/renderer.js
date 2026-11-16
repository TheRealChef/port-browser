// Renderer: tell Port the real platform, and connect Port's window controls to Electron.
import Port from "@port/ui";
import "@port/ui/port.css";
const root = Port.init(document.querySelector(".port"), { theme: "system", platform: window.portWindow.platform });
root.addEventListener("click", (e) => {
  const b = e.target.closest(".wctl button"); if (!b) return;
  const label = b.getAttribute("aria-label");
  if (label === "Minimise") window.portWindow.minimize();
  if (label === "Maximise") window.portWindow.maximize();
  if (label === "Close") window.portWindow.close();
});
