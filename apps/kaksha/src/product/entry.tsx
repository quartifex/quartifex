// The /app bundle's entry. The app is built by scripts/build-app.mjs into public/app as
// static files, so it runs with no server at all once the service worker has it.
import { createRoot } from "react-dom/client";
import AppRoot from "./AppRoot";
import "./product.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<AppRoot />);
