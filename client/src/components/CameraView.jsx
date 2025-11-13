import { API_URL } from "../constants";
import { useRef } from "preact/hooks";

const EFFECT_INFO = {
  none: { name: "Normal", icon: "📷" },
  fisheye: { name: "Fish Eye", icon: "🐟" },
  grayscale: { name: "Grayscale", icon: "⚫" },
  sepia: { name: "Sepia", icon: "📜" },
  vignette: { name: "Vignette", icon: "🌑" },
  blur: { name: "Blur", icon: "💨" },
  sharpen: { name: "Sharpen", icon: "🔪" },
  invert: { name: "Invert", icon: "🔄" },
  pixelate: { name: "Pixelate", icon: "🟦" },
};

export default function CameraView({
  isCapturing,
  countdown,
  currentPhoto,
  previewImage,
  isPreviewActive,
  mjpegStreamUrl,
  mjpegBust,
  currentEffect,
  effectParams,
}) {
  const containerRef = useRef(null);

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen();
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden" ref={containerRef}>
      <div className="aspect-video bg-gray-900 relative">
        {/* Camera Preview or Current Photo - Preview takes priority over captured photo */}
        {mjpegStreamUrl && isPreviewActive ? (
          <img
            key={`mjpeg-${mjpegBust || 0}`}
            src={`${mjpegStreamUrl}${mjpegBust ? `?t=${mjpegBust}` : ""}`}
            alt="Live MJPEG stream"
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error("MJPEG stream error:", e);
              e.target.style.display = "none";
            }}
            onLoad={(e) => {
              console.log("MJPEG stream loaded");
              e.target.style.display = "block";
            }}
          />
        ) : previewImage ? (
          <img
            src={previewImage}
            alt="Live preview"
            className="w-full h-full object-contain"
          />
        ) : currentPhoto ? (
          <img
            src={`${API_URL}${currentPhoto.Path}`}
            alt="Captured photo"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-24 h-24 text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-gray-400 text-lg">Siap untuk foto</p>
              <p className="text-gray-500 text-sm mt-2">
                Tekan tombol untuk memulai
              </p>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {isCapturing && countdown > 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-8xl font-bold animate-countdown">
              {countdown}
            </div>
          </div>
        )}

        {/* Capturing Indicator */}
        {isCapturing && countdown === 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 text-lg font-medium">
                Mengambil foto...
              </p>
            </div>
          </div>
        )}

        {/* Camera Status Badge */}
        <div className="absolute top-4 left-4">
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
              isPreviewActive
                ? "bg-red-600 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isPreviewActive ? "bg-white animate-pulse" : "bg-gray-300"
              }`}
            ></div>
            <span>
              {isPreviewActive
                ? mjpegStreamUrl
                  ? "MJPEG LIVE"
                  : "LIVE"
                : "PREVIEW OFF"}
            </span>
          </div>
        </div>

        {/* Effect Badge */}
        {currentEffect && currentEffect !== "none" && (
          <div className="absolute top-4 right-4">
            <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 shadow-lg">
              <span className="text-lg">
                {EFFECT_INFO[currentEffect]?.icon || "🎨"}
              </span>
              <span>{EFFECT_INFO[currentEffect]?.name || "Effect"}</span>
              {effectParams && Object.keys(effectParams).length > 0 && (
                <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen Button */}
        <div className="absolute top-4 right-4 mt-12">
          <button
            onClick={handleFullscreen}
            title="Fullscreen"
            className="bg-gray-800/70 hover:bg-gray-700 text-white p-2 rounded-lg shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4h4M4 20v-4h4M20 8V4h-4M20 20v-4h-4"
              />
            </svg>
          </button>
        </div>

        {/* Photo Info Overlay */}
        {currentPhoto && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-75 text-white p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Foto Terakhir</p>
                  <p className="text-xs text-gray-300">
                    {new Date(parseInt(currentPhoto.Timestamp)).toLocaleString(
                      "id-ID"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-green-400">Tersimpan</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Mode:</span>
              <span className="ml-1 text-primary-600">Auto</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Resolusi:</span>
              <span className="ml-1 text-primary-600">HD</span>
            </div>
            {currentEffect && currentEffect !== "none" && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Efek:</span>
                <span className="ml-1 text-purple-600 flex items-center space-x-1">
                  <span>{EFFECT_INFO[currentEffect]?.icon}</span>
                  <span>{EFFECT_INFO[currentEffect]?.name}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
