import { useEffect, useState, lazy, Suspense } from "preact/compat";
import { route } from "preact-router";
import BoothRegistration from "./components/BoothRegistration.jsx";
import CameraView from "./components/CameraView.jsx";
import PhotoGallery from "./components/PhotoGallery.jsx";
import Controls from "./components/Controls.jsx";
import LayoutPage from "./components/LayoutPage.jsx";
import { useNotify } from "./components/Notify.jsx";
import { appState } from "./main.jsx";
import { WS_URL, API_URL, BACKOFFICE_SOCKET_URL } from "./constants";
import io from "socket.io-client";

// Lazy loaded components untuk code splitting
const OptimizedTemplateEditor = lazy(() =>
  import("./components/OptimizedTemplateEditor.jsx")
);

// Loading component untuk lazy loading
const EditorLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mb-4 shadow-lg animate-glow">
        <svg
          className="w-8 h-8 text-white animate-spin"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-secondary-900 mb-2">
        Memuat Editor...
      </h2>
      <p className="text-secondary-600">Sedang menyiapkan tools editing foto</p>
    </div>
  </div>
);

// Error boundary component untuk lazy loading
const EditorError = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white flex items-center justify-center">
    <div className="bg-white/85 backdrop-blur-md rounded-3xl p-8 shadow-soft-lg border border-primary-200 max-w-md">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Editor Error
        </h2>
        <p className="text-secondary-600 mb-4">
          {error?.message || "Terjadi kesalahan saat memuat editor"}
        </p>
        <button
          onClick={onRetry}
          className="btn-gradient px-6 py-2 rounded-xl text-white font-medium transition-all shadow-soft hover:shadow-soft-lg"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  </div>
);

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
        const location =
          typeof loc === "string" ? loc : `${loc.lat || 0},${loc.lng || 0}`;
        const outletId = "out-1";
        const registrationTimeout = setTimeout(() => {
          notify("error", "Gagal mendaftar ke backoffice");
        }, 5000);
        boSocket.emit(
          "register",
          { name, location, outlet_id: outletId },
          (response) => {
            clearTimeout(registrationTimeout);
            if (response && response.success) {
              notify("success", "Berhasil terhubung ke backoffice");
            } else {
              notify("error", "Gagal mendaftar ke backoffice");
            }
          }
        );
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
              className="size-10 text-white"
              width="800px"
              height="800px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="24" height="24" fill="transparent" />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M3.64018 4.2318C3.21591 3.87824 2.58534 3.93556 2.23178 4.35984C1.87821 4.78412 1.93554 5.41468 2.35982 5.76825L3.28434 6.53872C2.69351 6.95061 2.25955 7.56935 2.08406 8.29334C1.99875 8.64532 1.99913 9.04286 1.99957 9.504L1.99964 16.0658C1.99959 16.9523 1.99954 17.7162 2.08178 18.3278C2.16991 18.9833 2.36866 19.6117 2.87832 20.1214C3.38798 20.631 4.01633 20.8298 4.67185 20.9179C5.28351 21.0001 6.04734 21.0001 6.93383 21H17.0654C17.9519 21.0001 18.7158 21.0001 19.3274 20.9179C19.6485 20.8747 19.963 20.805 20.2602 20.6853L20.3598 20.7682C20.7841 21.1218 21.4147 21.0645 21.7682 20.6402C22.1218 20.2159 22.0645 19.5854 21.6402 19.2318L3.64018 4.2318ZM14.6421 16.0034C13.9374 16.6238 13.0127 17.0001 12 17.0001C9.79086 17.0001 8 15.2092 8 13.0001C8 12.2476 8.20778 11.5437 8.56908 10.9425L10.1436 12.2546C10.051 12.4849 10 12.7365 10 13C10 14.1046 10.8954 15 12 15C12.3926 15 12.7588 14.8869 13.0677 14.6915L14.6421 16.0034Z"
                fill="currentColor"
                className="fill-secondary-600"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M21.9999 9.50393C21.9999 9.53745 21.9999 9.57132 21.9999 9.60552L21.9999 16C21.9999 16.5523 21.5522 17 20.9999 17C20.4476 17 19.9999 16.5523 19.9999 16L19.9999 9.60552C19.9999 8.98423 19.9928 8.85124 19.9717 8.7644C19.8835 8.40047 19.5994 8.11632 19.2354 8.02811C19.1486 8.00706 19.0156 7.99997 18.3943 7.99997C18.3761 7.99997 18.3579 7.99998 18.34 7.99999C18.0782 8.00014 17.8487 8.00028 17.6255 7.96682C16.9412 7.86424 16.3133 7.52823 15.8483 7.0157C15.6967 6.84854 15.5695 6.65752 15.4244 6.43965C15.4145 6.4247 15.4045 6.40962 15.3943 6.39442L15.1678 6.05467C14.7318 5.4006 14.6354 5.27991 14.5319 5.2018C14.4492 5.13936 14.3573 5.09017 14.2594 5.05597C14.1371 5.01319 13.9832 4.99997 13.1971 4.99997L9.90126 4.99997C9.67248 4.99997 9.45883 5.11431 9.33192 5.30467L9.08192 5.67967C8.77557 6.1392 8.1547 6.26337 7.69517 5.95702C7.23564 5.65067 7.11147 5.0298 7.41782 4.57027L7.66782 4.19527C8.16566 3.44851 9.00377 2.99997 9.90126 2.99997L13.1971 2.99997C13.2384 2.99997 13.2793 2.99992 13.3199 2.99986C13.9119 2.99907 14.4341 2.99838 14.9193 3.16797C15.2129 3.27056 15.4886 3.41815 15.7368 3.60547C16.1471 3.91512 16.4362 4.35 16.7639 4.84304C16.7864 4.87685 16.809 4.91094 16.8319 4.94527L17.0584 5.28502C17.2505 5.57314 17.2914 5.62971 17.3296 5.67188C17.4846 5.84272 17.6939 5.95473 17.922 5.98892C17.9783 5.99736 18.048 5.99997 18.3943 5.99997C18.4285 5.99997 18.4624 5.99994 18.4959 5.9999C18.957 5.99946 19.3546 5.99908 19.7066 6.08439C20.7984 6.34903 21.6508 7.20148 21.9154 8.29327C22.0008 8.64526 22.0004 9.0428 21.9999 9.50393Z"
                fill="currentColor"
                className="fill-secondary-600"
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
          <div className="mt-6 flex justify-center">
            <button onClick={() => route("/editor")} className="btn-gradient">
              Buka Photo Editor
            </button>
          </div>
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
