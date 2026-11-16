// Tailwind: Port's tokens as utilities (bg-port-surface-1, text-port-ink-2, rounded-port-ctl, shadow-port-tile …).
// Utilities read CSS variables, so render them inside a .port root and include @port/ui/tokens.css (or port.css).
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  presets: [require("@port/ui/tailwind")],
};
