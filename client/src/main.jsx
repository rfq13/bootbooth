import { render } from "preact";
import { signal } from "@preact/signals";
import "./index.css";
import App from "./App.jsx";
import { NotifyProvider } from "./components/Notify.jsx";
import AppRouter from "./components/AppRouter.jsx";

// Global state
const appState = signal({
  cameraConnected: false,
  isCapturing: false,
  photos: [],
  currentPhoto: null,
  countdown: 0,
  flash: false,
  isEditing: false,
});

export { appState };

render(
  <NotifyProvider>
    <AppRouter />
  </NotifyProvider>,
  document.getElementById("app")
);
