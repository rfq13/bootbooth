import { render } from "preact";
import { Router } from "preact-router";
import { signal } from "@preact/signals";
import "./index.css";
import App from "./App.jsx";
import { NotifyProvider } from "./components/Notify.jsx";

// Global state
const appState = signal({
  cameraConnected: false,
  isCapturing: false,
  photos: [],
  currentPhoto: null,
  countdown: 0,
  flash: false,
});

export { appState };

render(
  <NotifyProvider>
    <Router>
      <App path="/" />
    </Router>
  </NotifyProvider>,
  document.getElementById("app")
);
