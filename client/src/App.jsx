import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import io from "socket.io-client";
import CameraView from "./components/CameraView.jsx";
import PhotoGallery from "./components/PhotoGallery.jsx";
import Controls from "./components/Controls.jsx";
import StatusIndicator from "./components/StatusIndicator.jsx";
import LayoutPicker from "./components/LayoutPicker.jsx";
import PrintComposer from "./components/PrintComposer.jsx";
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
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [mjpegStreamUrl, setMjpegStreamUrl] = useState(null);
  const [mjpegBust, setMjpegBust] = useState(0);
  const [currentEffect, setCurrentEffect] = useState("none");
  const [effectParams, setEffectParams] = useState({});
  const [isStartingPreview, setIsStartingPreview] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState("single_4R");
  const [composedUrl, setComposedUrl] = useState(null);
  const [songTitle, setSongTitle] = useState("About You");
  const [songArtist, setSongArtist] = useState("The 1975");
  const [showLayoutPage, setShowLayoutPage] = useState(false);

  useEffect(() => {
    checkCameraStatus();
    loadPhotos(setPhotos);

    socket.on("connect", () => {
      setSocketConnected(true);
      console.log("Terhubung ke server");
    });

    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      console.log("Terputus dari server:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
    });

    socket.on("preview_frame", (data) => {
      if (data.image) {
        setPreviewImage(data.image);
      }
    });

    socket.on("capture_complete", (data) => {
      console.log("Capture complete:", data);
      loadPhotos();
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("preview_frame");
      socket.off("capture_complete");
    };
  }, []);

  const handleStartPreview = async () => {
    if (isStartingPreview || isPreviewActive) return;

    setIsStartingPreview(true);
    try {
      const response = await fetch(`${API_URL}/camera/preview/start`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setIsPreviewActive(true);
        setMjpegStreamUrl(data.streamUrl);
        setMjpegBust(Date.now());
      }
    } catch (error) {
      console.error("Error starting preview:", error);
    } finally {
      setIsStartingPreview(false);
    }
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
          <h1 className="text-5xl font-bold mb-4 text-secondary-900 font-poppins animate-float drop-shadow-sm">
            Digitize your photobooth
          </h1>
          <p className="text-lg text-secondary-700 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Experience live preview, instant effects, and easy captures with our
            modern photobooth solution. Perfect for creating memorable moments
            with style.
          </p>

          {/* New button to navigate to layout page */}
          <div className="mt-6">
            <button
              onClick={() => setShowLayoutPage(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Pilih Layout Foto
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
                  isPreviewActive ? "bg-green-500" : "bg-yellow-500"
                } animate-pulse`}
              ></div>
              <span className="text-secondary-900 font-medium">
                Kamera: {isPreviewActive ? "Terhubung" : "Menghubungkan"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Preview Area */}
          <div className="xl:col-span-3">
            <div className="bg-white/85 backdrop-blur-md rounded-3xl p-8 shadow-soft-lg border border-primary-200">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-secondary-900 mb-2 font-poppins drop-shadow-sm">
                  Live Preview
                </h2>
                <p className="text-secondary-700">
                  See your photobooth in real-time
                </p>
              </div>

              {/* Preview Frame */}
              <div className="relative bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-4 mb-6 shadow-soft">
                <div className="bg-secondary-900 rounded-xl overflow-hidden shadow-2xl">
                  <CameraView
                    previewImage={previewImage}
                    mjpegStreamUrl={mjpegStreamUrl}
                    mjpegBust={mjpegBust}
                    isPreviewActive={isPreviewActive}
                    currentEffect={currentEffect}
                    effectParams={effectParams}
                    onChangeEffect={(key) => setCurrentEffect(key)}
                  />
                </div>
              </div>

              {/* Start Preview Button */}
              <div className="text-center">
                <button
                  onClick={handleStartPreview}
                  disabled={isStartingPreview || isPreviewActive}
                  className={`inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-soft-lg ${
                    isPreviewActive
                      ? "bg-gradient-to-r from-green-400 to-green-600 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-primary-200 via-primary-400 to-primary-500 text-white hover:from-primary-300 hover:via-primary-500 hover:to-primary-600 shadow-soft-lg"
                  }`}
                >
                  {isStartingPreview ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Starting...
                    </>
                  ) : isPreviewActive ? (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Preview Active
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Start Preview
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Effects Panel removed: controls moved into floating overlay in CameraView */}
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
                } catch (e) {
                  console.error("Delete failed", e);
                }
              }}
            />

            {/* Layout & Print */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                Layout & Print (4R)
              </h3>
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-primary-200 shadow-soft">
                  <p className="text-secondary-800 mb-4">
                    Pilih layout. Jika belum memilih foto, akan ditampilkan
                    template preview.
                  </p>
                  <div className="max-w-xl mx-auto">
                    {/* Lazy import to avoid circular */}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-primary-200 shadow-soft">
                    <p className="text-secondary-800 mb-3">Pilih Layout</p>
                    <LayoutPicker
                      selectedLayout={selectedLayout}
                      onPick={(id) => setSelectedLayout(id)}
                      onShowLayoutPage={() => setShowLayoutPage(true)}
                    />
                    {(selectedLayout === "photostrip_spotify" ||
                      selectedLayout === "spotify_card") && (
                      <div className="mt-4 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-primary-200 shadow-soft">
                        <p className="text-secondary-800 font-medium mb-3">
                          Teks Pemutar Musik
                        </p>
                        <label className="block text-sm text-secondary-700 mb-1">
                          Judul Lagu
                        </label>
                        <input
                          className="w-full mb-3 px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                          value={songTitle}
                          onInput={(e) => setSongTitle(e.currentTarget.value)}
                        />
                        <label className="block text-sm text-secondary-700 mb-1">
                          Artis
                        </label>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                          value={songArtist}
                          onInput={(e) => setSongArtist(e.currentTarget.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <PrintComposer
                      photo={currentPhoto}
                      layoutId={selectedLayout}
                      songTitle={songTitle}
                      songArtist={songArtist}
                      onComposed={(url) => setComposedUrl(url)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
async function checkCameraStatus() {
  try {
    const response = await fetch(`${API_URL}/api/status`);
    const data = await response.json();
    console.log("Camera status:", data);
  } catch (error) {
    console.error("Error checking camera status:", error);
  }
}

async function loadPhotos(setter) {
  try {
    const response = await fetch(`${API_URL}/api/photos`);
    const data = await response.json();
    console.log("Loaded photos:", data);
    if (Array.isArray(data)) setter(data);
  } catch (error) {
    console.error("Error loading photos:", error);
  }
}
