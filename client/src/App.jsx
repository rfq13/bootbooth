import { useEffect, useState } from "preact/hooks";
import BoothRegistration from "./components/BoothRegistration.jsx";
import CameraView from "./components/CameraView.jsx";
import PhotoGallery from "./components/PhotoGallery.jsx";
import Controls from "./components/Controls.jsx";
import LayoutPage from "./components/LayoutPage.jsx";
import { useNotify } from "./components/Notify.jsx";
import { appState } from "./main.jsx";
import { WS_URL, API_URL, BACKOFFICE_SOCKET_URL } from "./constants";
import io from "socket.io-client";

// DEBUG: WebSocket connection configuration
console.log("🔍 DEBUG: Attempting to connect WebSocket to:", WS_URL);
console.log("🔍 DEBUG: WebSocket config:", {
  reconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
});

let websocket = null;
let boSocket = null;

// WebSocket connection functions
function connectWebSocket(url) {
  try {
    websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log("✅ DEBUG: WebSocket connected successfully!");
      console.log("🔍 DEBUG: WebSocket URL:", url);
      if (window.onWebSocketConnected) {
        window.onWebSocketConnected();
      }
    };

    websocket.onclose = (event) => {
      console.log(
        "❌ DEBUG: WebSocket disconnected. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      if (window.onWebSocketDisconnected) {
        window.onWebSocketDisconnected();
      }
    };

    websocket.onerror = (error) => {
      console.log("❌ DEBUG: WebSocket connection error:", error);
      if (window.onWebSocketError) {
        window.onWebSocketError(error);
      }
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Received WebSocket message:", data);

        if (data.event && window.onWebSocketEvent) {
          window.onWebSocketEvent(data.event, data.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    return websocket;
  } catch (error) {
    console.error("Error creating WebSocket connection:", error);
    return null;
  }
}

function sendWebSocketEvent(event, data = {}) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({
      event: event,
      data: data,
    });
    websocket.send(message);
    console.log("📤 Sent WebSocket event:", event, data);
  } else {
    console.warn("WebSocket not connected, cannot send event:", event);
  }
}

// Backoffice Socket.IO connection (unchanged)
console.log(
  "🔍 DEBUG: Attempting to connect backoffice Socket.IO to:",
  BACKOFFICE_SOCKET_URL
);

try {
  console.log({ BACKOFFICE_SOCKET_URL });
  boSocket = io(BACKOFFICE_SOCKET_URL, {
    transports: ["polling"],
    upgrade: false,
    rememberUpgrade: false,
    path: "/socket.io/",
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 5000,
    forceNew: true,
    autoConnect: false,
  });
} catch (error) {
  console.error("Error creating backoffice Socket.IO connection:", error);
}

export default function App() {
  const notify = useNotify();
  const [socketConnected, setSocketConnected] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [mjpegStreamUrl, setMjpegStreamUrl] = useState(null);
  const [mjpegBust, setMjpegBust] = useState(0);
  const [currentEffect, setCurrentEffect] = useState("none");
  const [effectParams, setEffectParams] = useState({
    intensity: 0.5,
    radius: 1.0,
    pixelSize: 10,
  });
  const [isStartingPreview, setIsStartingPreview] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState("single_4R");
  const [composedUrl, setComposedUrl] = useState(null);
  const [songTitle, setSongTitle] = useState("About You");
  const [songArtist, setSongArtist] = useState("The 1975");
  const [showLayoutPage, setShowLayoutPage] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [identity, setIdentity] = useState(null);

  const checkCameraStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/status`);
      const data = await response.json();
      console.log("Camera status:", data);
      // Update camera connected state
      if (data.cameraConnected !== undefined) {
        setCameraConnected(data.cameraConnected);
        // Also update global state
        appState.value = {
          ...appState.value,
          cameraConnected: data.cameraConnected,
        };
      }
    } catch (error) {
      console.error("Error checking camera status:", error);
      setCameraConnected(false);
      // Also update global state
      appState.value = {
        ...appState.value,
        cameraConnected: false,
      };
    }
  };

  useEffect(() => {
    const checkIdentity = async () => {
      try {
        const res = await fetch(`${API_URL}/api/identity`);
        const data = await res.json();
        console.log("check identity", data);
        if (data.success) {
          setIdentityReady(true);
          setIdentity(data);
        } else {
          setIdentityReady(false);
        }
      } catch (_) {
        setIdentityReady(false);
      }
    };
    checkIdentity();
  }, []);

  useEffect(() => {
    if (!identityReady) return;

    checkCameraStatus();
    loadPhotos(setPhotos);

    // WebSocket event handlers
    window.onWebSocketConnected = () => {
      console.log("✅ DEBUG: WebSocket connected successfully!");
      setSocketConnected(true);
      checkCameraStatus();
    };

    window.onWebSocketDisconnected = () => {
      console.log("❌ DEBUG: WebSocket disconnected");
      setSocketConnected(false);
    };

    window.onWebSocketError = (error) => {
      console.log("❌ DEBUG: WebSocket connection error:", error);
      setSocketConnected(false);
    };

    window.onWebSocketEvent = (eventName, data) => {
      console.log("📨 Received WebSocket event:", eventName, data);

      switch (eventName) {
        case "connected":
          // Connection confirmation
          break;
        case "previewFrame":
          if (data.image) setPreviewImage(data.image);
          break;
        case "photoCaptured":
          loadPhotos(setPhotos);
          appState.value = {
            ...appState.value,
            photos: [data, ...appState.value.photos],
            currentPhoto: data,
            isCapturing: false,
            flash: true,
          };
          setTimeout(() => {
            appState.value = { ...appState.value, flash: false };
          }, 300);
          break;
        case "photoDeleted":
          loadPhotos(setPhotos);
          appState.value = {
            ...appState.value,
            photos: appState.value.photos.filter(
              (photo) => photo.Filename !== data.filename
            ),
          };
          if (
            appState.value.currentPhoto &&
            appState.value.currentPhoto.Filename === data.filename
          ) {
            appState.value = { ...appState.value, currentPhoto: null };
          }
          break;
        case "preview-started":
          if (data.success) {
            setIsPreviewActive(true);
            setMjpegBust(Date.now());
            appState.value = { ...appState.value, currentPhoto: null };
          }
          break;
        case "preview-stopped":
          setIsPreviewActive(false);
          setPreviewImage(null);
          setMjpegStreamUrl(null);
          break;
        case "mjpeg-stream-started":
          if (data.success) {
            setMjpegStreamUrl(data.streamUrl);
            setMjpegBust(Date.now());
            setIsPreviewActive(true);
            appState.value = { ...appState.value, currentPhoto: null };
          }
          break;
        case "mjpeg-stream-stopped":
          setMjpegStreamUrl(null);
          setMjpegBust(0);
          setIsPreviewActive(false);
          setPreviewImage(null);
          break;
        case "camera-detected":
          if (data.success !== undefined) {
            setCameraConnected(data.success);
            appState.value = {
              ...appState.value,
              cameraConnected: data.success,
            };
          }
          break;
        case "api-response":
          // Handle API responses if needed
          break;
        case "photo-effect-applied":
          // Handle when effect is applied to current photo
          if (data.success === "true") {
            console.log("✅ Effect applied to photo:", data.filename);

            // Force refresh the current photo by updating the mjpegBust to trigger a re-render
            setMjpegBust(Date.now());

            // Show notification
            notify("success", `Efek ${data.effect} berhasil diterapkan`);
          } else {
            console.error("❌ Failed to apply effect to photo");
            notify("error", "Gagal menerapkan efek pada foto");
          }
          break;
        default:
          console.log("⚠️ Unknown WebSocket event:", eventName);
      }
    };

    // Connect WebSocket
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      websocket = connectWebSocket(WS_URL);
    }

    // Backoffice Socket.IO connection
    if (boSocket) {
      const doRegister = () => {
        if (!identity || !identity.booth_name) return;
        const name = identity.booth_name;
        const loc = identity.location || {};
        const location = typeof loc === "string" ? loc : `${loc.lat || 0},${loc.lng || 0}`;
        const outletId = "out-1";
        const registrationTimeout = setTimeout(() => {
          notify("error", "Gagal mendaftar ke backoffice");
        }, 5000);
        boSocket.emit("register", { name, location, outlet_id: outletId }, (response) => {
          clearTimeout(registrationTimeout);
          if (response && response.success) {
            notify("success", "Berhasil terhubung ke backoffice");
          } else {
            notify("error", "Gagal mendaftar ke backoffice");
          }
        });
      };

      boSocket.off("connect");
      boSocket.off("registered");
      boSocket.off("disconnect");
      boSocket.off("connect_error");

      boSocket.on("connect", () => {
        doRegister();
      });

      boSocket.on("registered", (data) => {
        if (data.success) {
          notify("success", "Berhasil terdaftar di backoffice");
        }
      });

      boSocket.on("disconnect", (reason) => {
        notify("warning", `Koneksi backoffice terputus: ${reason}`);
      });

      boSocket.on("connect_error", (error) => {
        notify("error", `Koneksi backoffice gagal: ${error.message}`);
      });

      if (boSocket.connected) {
        doRegister();
      } else {
        boSocket.connect();
      }
    }

    return () => {
      // Cleanup WebSocket event handlers
      window.onWebSocketConnected = null;
      window.onWebSocketDisconnected = null;
      window.onWebSocketError = null;
      window.onWebSocketEvent = null;

      // Close WebSocket connection
      if (websocket) {
        websocket.close();
        websocket = null;
      }

      if (boSocket) {
        boSocket.off("connect");
        boSocket.off("disconnect");
      }
    };
  }, [identityReady, identity]);

  const handleStartPreview = () => {
    if (!cameraConnected) {
      notify("warning", "Kamera tidak terhubung");
      return;
    }

    if (isStartingPreview || isPreviewActive) {
      return;
    }

    setIsStartingPreview(true);

    // Stop any existing preview first
    sendWebSocketEvent("stop-preview");
    sendWebSocketEvent("stop-mjpeg");

    // Clear preview state
    setPreviewImage(null);
    setMjpegStreamUrl(null);
    setIsPreviewActive(false);

    // Wait a bit then start preview with effect
    setTimeout(() => {
      sendWebSocketEvent("start-preview", {
        effect: currentEffect,
        params: effectParams,
      });
      setIsStartingPreview(false);
    }, 300);
  };

  // Apply effect when changed during preview or when currentPhoto is displayed
  useEffect(() => {
    console.log("APPLYING EFFECT...", {
      effect: currentEffect,
      params: effectParams,
      isPreviewActive,
      hasCurrentPhoto: !!currentPhoto,
    });

    // Send apply-effect event if preview is active OR if we have a current photo
    if (isPreviewActive || currentPhoto) {
      const eventData = {
        effect: currentEffect,
        params: effectParams,
      };

      // Add current photo information if we're not in preview mode
      if (!isPreviewActive && currentPhoto) {
        eventData.currentPhoto = "true";
        eventData.filename = currentPhoto.filename || currentPhoto.Filename;
      }

      sendWebSocketEvent("apply-effect", eventData);
    }
  }, [currentEffect, effectParams, isPreviewActive, currentPhoto]);

  const handleCapturePhoto = () => {
    if (!cameraConnected || isCapturing) return;

    setIsCapturing(true);
    setCountdown(3); // 3 second countdown

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);

          // Capture photo after countdown
          sendWebSocketEvent("capture-photo", {
            effect: currentEffect,
            params: effectParams,
          });

          // Reset capturing state after a delay
          setTimeout(() => {
            setIsCapturing(false);
            setCountdown(0);
          }, 1000);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChangeEffectParams = (newParams) => {
    setEffectParams(newParams);

    // If preview is active OR if we have a current photo, send the updated params to the server
    console.log("APPLYING EFFECT...", {
      newParams,
      isPreviewActive,
      hasCurrentPhoto: !!currentPhoto,
    });

    if (isPreviewActive || currentPhoto) {
      const eventData = {
        effect: currentEffect,
        params: newParams,
      };

      // Add current photo information if we're not in preview mode
      if (!isPreviewActive && currentPhoto) {
        eventData.currentPhoto = "true";
        eventData.filename = currentPhoto.filename || currentPhoto.Filename;
      }

      sendWebSocketEvent("apply-effect", eventData);
    }
  };

  const handleStopPreview = () => {
    sendWebSocketEvent("stop-preview");
    sendWebSocketEvent("stop-mjpeg");
    setIsPreviewActive(false);
    setPreviewImage(null);
    setMjpegStreamUrl(null);
  };

  // If layout page is shown, render it instead of the main app
  if (!identityReady) {
    return (
      <BoothRegistration
        onRegistered={(id) => {
          setIdentityReady(true);
          setIdentity(id);
        }}
      />
    );
  }
  if (showLayoutPage) {
    return <LayoutPage onBack={() => setShowLayoutPage(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mb-4 shadow-lg animate-glow">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-bold mb-4 font-poppins animate-float drop-shadow-sm h-32 shiny-text">
            Digitize your photobooth
          </h1>
          <p className="text-lg text-secondary-700 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Experience live preview, instant effects, and easy captures with our
            modern photobooth solution. Perfect for creating memorable moments
            with style.
          </p>
        </header>

        {/* Status Indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-6 bg-white/80 backdrop-blur-md rounded-2xl px-8 py-4 shadow-soft-lg border border-primary-200">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  socketConnected ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              ></div>
              <span className="text-secondary-900 font-medium">
                Server: {socketConnected ? "Aktif" : "Tidak Aktif"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  cameraConnected ? "bg-green-500" : "bg-yellow-500"
                } animate-pulse`}
              ></div>
              <span className="text-secondary-900 font-medium">
                Kamera: {cameraConnected ? "Terhubung" : "Tidak Terhubung"}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto px-4">
          {/* Main Container */}
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                Live Preview
              </h2>
              <p className="text-slate-600 text-base">
                See your photobooth in real-time
              </p>
            </div>

            {/* Camera Preview Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xl">
              <CameraView
                isCapturing={isCapturing}
                countdown={countdown}
                currentPhoto={currentPhoto}
                previewImage={previewImage}
                mjpegStreamUrl={mjpegStreamUrl}
                mjpegBust={mjpegBust}
                isPreviewActive={isPreviewActive}
                currentEffect={currentEffect}
                effectParams={effectParams}
                onChangeEffect={(key) => setCurrentEffect(key)}
                onChangeEffectParams={handleChangeEffectParams}
              />
            </div>

            {/* Controls Section */}
            <div className="flex justify-center">
              <Controls
                onCapture={handleCapturePhoto}
                isCapturing={isCapturing}
                cameraConnected={cameraConnected}
                onStartPreview={handleStartPreview}
                onStopPreview={handleStopPreview}
                isPreviewActive={isPreviewActive}
              />
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => {
                  handleStopPreview();
                  setShowLayoutPage(true);
                }}
                className="px-8 py-4 rounded-2xl font-semibold text-base bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all shadow-soft-lg"
              >
                Selesai Pemotretan • Pilih Layout
              </button>
            </div>
          </div>
        </div>

        {/* Photo Gallery Section */}
        <div className="mt-12">
          <div className="bg-white/85 backdrop-blur-md rounded-3xl p-8 shadow-soft-lg border border-primary-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2 font-poppins drop-shadow-sm">
                Recent Captures
              </h2>
              <p className="text-secondary-700">Your memorable moments</p>
            </div>
            <PhotoGallery
              photos={photos}
              currentPhoto={currentPhoto}
              onSelectPhoto={(p) => setCurrentPhoto(p)}
              onDeletePhoto={async (filename) => {
                try {
                  const resp = await fetch(
                    `${API_URL}/api/photos/${filename}`,
                    { method: "DELETE" }
                  );
                  if (resp.ok) {
                    setPhotos((prev) =>
                      prev.filter((ph) => ph.Filename !== filename)
                    );
                    if (currentPhoto?.Filename === filename)
                      setCurrentPhoto(null);
                  }
                  return resp;
                } catch (e) {
                  console.error("Delete failed", e);
                  throw e;
                }
              }}
              onRefreshPhotos={() => loadPhotos(setPhotos)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
async function loadPhotos(setter) {
  try {
    const response = await fetch(`${API_URL}/api/photos`);
    const data = await response.json();
    console.log("Loaded photos:", data);
    // Backend returns {photos: [...]}, not direct array
    if (data.photos && Array.isArray(data.photos)) {
      setter(data.photos);
    } else if (Array.isArray(data)) {
      setter(data);
    }
  } catch (error) {
    console.error("Error loading photos:", error);
  }
}
