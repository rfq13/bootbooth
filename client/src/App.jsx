import { useEffect, useState } from "preact/hooks";
import io from "socket.io-client";
import CameraView from "./components/CameraView.jsx";
import PhotoGallery from "./components/PhotoGallery.jsx";
import Controls from "./components/Controls.jsx";
import LayoutPage from "./components/LayoutPage.jsx";
import { appState } from "./main.jsx";
import { SOCKET_URL, API_URL } from "./constants";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  path: "/socket.io/",
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 5000,
});

export default function App() {
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
    checkCameraStatus();
    loadPhotos(setPhotos);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("Terhubung ke server");
      // Check camera status when connected
      checkCameraStatus();
    });

    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      console.log("Terputus dari server:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Reconnected to server after", attemptNumber, "attempts");
      setSocketConnected(true);
      // Check camera status when reconnected
      checkCameraStatus();
    });

    socket.on("previewFrame", (data) => {
      if (data.image) {
        setPreviewImage(data.image);
      }
    });

    socket.on("photoCaptured", (data) => {
      console.log("Foto diambil:", data);
      // Update photos list
      loadPhotos(setPhotos);
      // Update global state
      appState.value = {
        ...appState.value,
        photos: [data, ...appState.value.photos],
        currentPhoto: data,
        isCapturing: false,
        flash: true,
      };

      // Remove flash effect after animation
      setTimeout(() => {
        appState.value = {
          ...appState.value,
          flash: false,
        };
      }, 300);
    });

    socket.on("photoDeleted", (data) => {
      console.log("Foto dihapus:", data);
      // Update photos list
      loadPhotos(setPhotos);
      // Update global state
      appState.value = {
        ...appState.value,
        photos: appState.value.photos.filter(
          (photo) => photo.Filename !== data.filename
        ),
      };

      // If the deleted photo was the current photo, clear it
      if (
        appState.value.currentPhoto &&
        appState.value.currentPhoto.Filename === data.filename
      ) {
        appState.value = {
          ...appState.value,
          currentPhoto: null,
        };
      }
    });

    socket.on("preview-started", (data) => {
      console.log("Preview dimulai:", data);
      if (data.success) {
        setIsPreviewActive(true);
        setMjpegBust(Date.now());
        // Clear current photo when preview starts to prioritize live preview
        appState.value = {
          ...appState.value,
          currentPhoto: null,
        };
      }
    });

    socket.on("preview-stopped", (data) => {
      console.log("Preview dihentikan:", data);
      setIsPreviewActive(false);
      setPreviewImage(null);
      setMjpegStreamUrl(null);
    });

    socket.on("mjpeg-stream-started", (data) => {
      console.log("MJPEG stream dimulai:", data);
      if (data.success) {
        setMjpegStreamUrl(data.streamUrl);
        setMjpegBust(Date.now());
        setIsPreviewActive(true);
        // Clear current photo when MJPEG stream starts to prioritize live preview
        appState.value = {
          ...appState.value,
          currentPhoto: null,
        };
      }
    });

    socket.on("mjpeg-stream-stopped", (data) => {
      console.log("MJPEG stream dihentikan:", data);
      setMjpegStreamUrl(null);
      setMjpegBust(0);
      setIsPreviewActive(false);
      setPreviewImage(null);
    });

    socket.on("camera-detected", (data) => {
      console.log("Kamera terdeteksi:", data);
      if (data.success !== undefined) {
        setCameraConnected(data.success);
        // Update global state
        appState.value = {
          ...appState.value,
          cameraConnected: data.success,
        };
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("previewFrame");
      socket.off("photoCaptured");
      socket.off("photoDeleted");
      socket.off("preview-started");
      socket.off("preview-stopped");
      socket.off("mjpeg-stream-started");
      socket.off("mjpeg-stream-stopped");
      socket.off("camera-detected");
    };
  }, []);

  const handleStartPreview = () => {
    if (!cameraConnected) {
      alert("Kamera tidak terhubung");
      return;
    }

    if (isStartingPreview || isPreviewActive) {
      return;
    }

    setIsStartingPreview(true);

    // Stop any existing preview first
    socket.emit("stop-preview");
    socket.emit("stop-mjpeg");

    // Clear preview state
    setPreviewImage(null);
    setMjpegStreamUrl(null);
    setIsPreviewActive(false);

    // Wait a bit then start preview with effect
    setTimeout(() => {
      socket.emit("start-preview", {
        effect: currentEffect,
        params: effectParams,
      });
      setIsStartingPreview(false);
    }, 300);
  };

  // Apply effect when changed during preview
  useEffect(() => {
    console.log("APPLYING EFFECT...", {
      effect: currentEffect,
      params: effectParams,
      isPreviewActive,
    });
    if (isPreviewActive) {
      socket.emit("apply-effect", {
        effect: currentEffect,
        params: effectParams,
      });
    }
  }, [currentEffect, effectParams, isPreviewActive]);

  const handleCapturePhoto = () => {
    if (!cameraConnected || isCapturing) return;

    setIsCapturing(true);
    setCountdown(3); // 3 second countdown

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);

          // Capture photo after countdown
          socket.emit("capture-photo", {
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

    // If preview is active, also send the updated params to the server
    console.log("APPLYING EFFECT...", { newParams, isPreviewActive });
    if (isPreviewActive) {
      socket.emit("apply-effect", {
        effect: currentEffect,
        params: newParams,
      });
    }
  };

  const handleStopPreview = () => {
    socket.emit("stop-preview");
    socket.emit("stop-mjpeg");
    setIsPreviewActive(false);
    setPreviewImage(null);
    setMjpegStreamUrl(null);
  };

  // If layout page is shown, render it instead of the main app
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
