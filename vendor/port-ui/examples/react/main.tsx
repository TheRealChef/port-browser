import { createRoot } from "react-dom/client";
import "../../dist/fonts.css";
import "../../dist/port.css";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(<App />);
