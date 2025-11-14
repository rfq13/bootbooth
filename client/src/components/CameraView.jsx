import { API_URL } from "../constants";
import { useRef, useState, useEffect } from "preact/hooks";

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
  onChangeEffect,
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div
      className={`relative bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden border border-primary-200 shadow-soft-lg ${
        isFullscreen ? "!rounded-none !border-0" : ""
      }`}
      ref={containerRef}
    >
      <div
        className={`bg-gradient-to-br from-primary-50 to-primary-100 relative ${
          isFullscreen ? "w-screen h-screen" : "aspect-video h-full"
        }`}
      >
        {/* Camera Preview or Current Photo - Preview takes priority over captured photo */}
        {mjpegStreamUrl && isPreviewActive ? (
          <img
            key={`mjpeg-${mjpegBust || 0}`}
            src={`${mjpegStreamUrl}${mjpegBust ? `?t=${mjpegBust}` : ""}`}
            alt="Live MJPEG stream"
            className={`w-full h-full ${isFullscreen ? "object-cover" : ""} ${
              isFullscreen ? "" : "rounded-xl"
            }`}
            onError={(e) => {
              console.error("MJPEG stream error:", e);
            }}
          />
        ) : previewImage && isPreviewActive ? (
          <img
            src={`data:image/jpeg;base64,${previewImage}`}
            alt="Camera Preview"
            className={`w-full h-full ${isFullscreen ? "object-cover" : ""} ${
              isFullscreen ? "" : "rounded-xl"
            }`}
          />
        ) : currentPhoto ? (
          <img
            src={`${API_URL}/uploads/${currentPhoto.Filename}`}
            alt="Captured Photo"
            className={`w-full h-full ${isFullscreen ? "object-cover" : ""} ${
              isFullscreen ? "" : "rounded-xl"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-secondary-600">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center animate-pulse">
                <svg
                  className="w-10 h-10 text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2 text-secondary-700">
                No Preview Available
              </p>
              <p className="text-sm text-secondary-500">
                Click "Start Preview" to begin
              </p>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {isCapturing && countdown > 0 && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-primary-200/80 backdrop-blur-sm ${
              isFullscreen ? "" : "rounded-xl"
            }`}
          >
            <div className="text-center">
              <div className="text-8xl font-bold text-secondary-900 animate-countdown drop-shadow-lg">
                {countdown}
              </div>
              <div className="text-secondary-700 text-lg mt-2">Get ready!</div>
            </div>
          </div>
        )}

        {/* Capturing Indicator */}
        {isCapturing && countdown === 0 && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-primary-100/90 backdrop-blur-sm ${
              isFullscreen ? "" : "rounded-xl"
            }`}
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-secondary-900 text-lg">Capturing...</div>
            </div>
          </div>
        )}

        {/* Effect Indicator */}
        {currentEffect !== "none" && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-secondary-900 shadow-soft">
            <span className="mr-2">
              {EFFECT_INFO[currentEffect]?.icon || "✨"}
            </span>
            <span className="font-medium">
              {EFFECT_INFO[currentEffect]?.name || currentEffect}
            </span>
          </div>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={handleFullscreen}
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-secondary-700 hover:text-secondary-900 hover:bg-white transition-colors shadow-soft"
          title="Toggle Fullscreen"
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
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>

        {/* Floating Effect Controls */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex justify-center sm:justify-between pointer-events-auto">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md border border-primary-200 rounded-2xl px-3 py-2 shadow-soft">
            {[
              {
                key: "none",
                label: "Normal",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M12 17a4 4 0 100-8 4 4 0 000 8z"
                    />
                  </svg>
                ),
              },
              {
                key: "fisheye",
                label: "Fish Eye",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M2.25 12C3.5 7.5 7.5 4.5 12 4.5s8.5 3 9.75 7.5C20.5 16.5 16.5 19.5 12 19.5S3.5 16.5 2.25 12z"
                    />
                    <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
                  </svg>
                ),
              },
              {
                key: "grayscale",
                label: "B&W",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ),
              },
              {
                key: "sepia",
                label: "Sepia",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.657 6.657l-2.121-2.121M8.464 8.464L6.343 6.343m12.314 0l-2.121 2.121M8.464 15.536l-2.121 2.121"
                    />
                  </svg>
                ),
              },
              {
                key: "vignette",
                label: "Vignette",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="4"
                      y="6"
                      width="16"
                      height="12"
                      rx="3"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
                  </svg>
                ),
              },
              {
                key: "vintage",
                label: "Vintage",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M12 8v8m-4-4h8"
                    />
                  </svg>
                ),
              },
            ].map((eff) => (
              <button
                key={eff.key}
                title={eff.label}
                onClick={() => onChangeEffect && onChangeEffect(eff.key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                  currentEffect === eff.key
                    ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white border-primary-500 shadow-soft animate-glow"
                    : "bg-primary-50 text-secondary-700 hover:bg-primary-100 border-primary-200"
                }`}
              >
                <span
                  className={`w-5 h-5 ${
                    currentEffect === eff.key
                      ? "text-white"
                      : "text-secondary-700"
                  }`}
                >
                  {eff.icon}
                </span>
                <span className="hidden sm:inline font-medium">
                  {eff.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
