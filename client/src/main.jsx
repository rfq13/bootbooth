import { render } from "preact";
import { Router } from "preact-router";
import { signal } from "@preact/signals";
import "./index.css";
import App from "./App.jsx";

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
  <Router>
    <App path="/" />
  </Router>,
  document.getElementById("app")
);
