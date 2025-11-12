import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import { io } from "socket.io-client";
import CameraView from "./components/CameraView.jsx";
import PhotoGallery from "./components/PhotoGallery.jsx";
import Controls from "./components/Controls.jsx";
import StatusIndicator from "./components/StatusIndicator.jsx";
import { appState } from "./main.jsx";
import { SOCKET_URL } from "./constants";

const socket = io(SOCKET_URL);

export default function App() {
  const [socketConnected, setSocketConnected] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [mjpegStreamUrl, setMjpegStreamUrl] = useState(null);

  useEffect(() => {
    // Check camera status on mount
    checkCameraStatus();
    loadPhotos();

    // Socket event listeners
    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("Terhubung ke server");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      console.log("Terputus dari server");
    });

    socket.on("photoCaptured", (data) => {
      console.log("Foto diambil:", data);
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
      appState.value = {
        ...appState.value,
        photos: appState.value.photos.filter(
          (photo) => photo.filename !== data.filename
        ),
      };
    });

    socket.on("previewFrame", (data) => {
      if (data.image) {
        setPreviewImage(data.image);
      }
    });

    socket.on("preview-started", (data) => {
      console.log("Preview dimulai:", data);
      if (data.success) {
        setIsPreviewActive(true);
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
    });

    socket.on("preview-error", (data) => {
      console.error("Preview error:", data.error);
      setIsPreviewActive(false);
      setPreviewImage(null);
      alert("Error preview: " + data.error);
    });

    socket.on("mjpeg-stream-started", (data) => {
      console.log("MJPEG stream dimulai:", data);
      if (data.success) {
        setMjpegStreamUrl(data.streamUrl);
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
      setIsPreviewActive(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("photoCaptured");
      socket.off("photoDeleted");
      socket.off("previewFrame");
      socket.off("preview-started");
      socket.off("preview-stopped");
      socket.off("preview-error");
      socket.off("mjpeg-stream-started");
      socket.off("mjpeg-stream-stopped");
      socket.off("photo-captured");
    };
  }, []);

  const checkCameraStatus = async () => {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      appState.value = {
        ...appState.value,
        cameraConnected: data.cameraConnected,
      };
    } catch (error) {
      console.error("Error checking camera status:", error);
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await fetch("/api/photos");
      const data = await response.json();
      appState.value = {
        ...appState.value,
        photos: data.photos,
      };
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const capturePhoto = async () => {
    if (appState.value.isCapturing) return;

    try {
      appState.value = {
        ...appState.value,
        isCapturing: true,
        countdown: 3,
      };

      // Countdown animation
      for (let i = 3; i > 0; i--) {
        appState.value = {
          ...appState.value,
          countdown: i,
        };
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      appState.value = {
        ...appState.value,
        countdown: 0,
      };

      // Use socket for capture to handle stream properly
      socket.emit("capture-photo");
    } catch (error) {
      console.error("Error capturing photo:", error);
      appState.value = {
        ...appState.value,
        isCapturing: false,
        countdown: 0,
      };
      alert("Gagal mengambil foto: " + error.message);
    }
  };

  const deletePhoto = async (filename) => {
    try {
      const response = await fetch(`/api/photos/${filename}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Gagal menghapus foto");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Gagal menghapus foto: " + error.message);
    }
  };

  const selectPhoto = (photo) => {
    appState.value = {
      ...appState.value,
      currentPhoto: photo,
    };
  };

  const startPreview = () => {
    if (!appState.value.cameraConnected) {
      alert("Kamera tidak terhubung");
      return;
    }

    socket.emit("start-preview");
  };

  const stopPreview = () => {
    socket.emit("stop-preview");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Flash overlay */}
      {appState.value.flash && (
        <div className="fixed inset-0 bg-white z-50 animate-flash pointer-events-none" />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">BootBooth</h1>
            </div>
            <StatusIndicator
              cameraConnected={appState.value.cameraConnected}
              socketConnected={socketConnected}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <CameraView
              isCapturing={appState.value.isCapturing}
              countdown={appState.value.countdown}
              currentPhoto={appState.value.currentPhoto}
              previewImage={previewImage}
              isPreviewActive={isPreviewActive}
              mjpegStreamUrl={mjpegStreamUrl}
            />
            <Controls
              onCapture={capturePhoto}
              isCapturing={appState.value.isCapturing}
              cameraConnected={appState.value.cameraConnected}
              onStartPreview={startPreview}
              onStopPreview={stopPreview}
              isPreviewActive={isPreviewActive}
            />
          </div>

          {/* Photo Gallery */}
          <div className="lg:col-span-1">
            <PhotoGallery
              photos={appState.value.photos}
              onSelectPhoto={selectPhoto}
              onDeletePhoto={deletePhoto}
              currentPhoto={appState.value.currentPhoto}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            BootBooth Photobooth - Powered by Node.js & Preact
          </div>
        </div>
      </footer>
    </div>
  );
}
