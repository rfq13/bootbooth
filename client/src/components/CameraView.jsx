import { API_URL } from "../constants";
import { useRef, useState, useEffect, useCallback } from "preact/hooks";

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
  onChangeEffectParams,
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const debounceRef = useRef(null);

  // Debounced function for updating effect parameters
  const debouncedUpdateEffectParams = useCallback(
    (params) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (onChangeEffectParams) {
          onChangeEffectParams(params);
        }
      }, 300); // 300ms debounce delay
    },
    [onChangeEffectParams]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
            src={`${API_URL}/uploads/${currentPhoto.filename}${
              currentEffect !== "none"
                ? `?effect=${currentEffect}&intensity=${
                    effectParams.intensity || 0.5
                  }&radius=${effectParams.radius || 1.0}&pixelSize=${
                    effectParams.pixelSize || 10
                  }`
                : ""
            }`}
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

        {/* Effect Parameters Slider - Only show when currentPhoto is displayed and effect is selected */}
        {currentPhoto && currentEffect !== "none" && (
          <div className="absolute bottom-20 left-4 right-4 sm:left-6 sm:right-6 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-soft-lg border border-primary-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Intensitas
                </label>
                <span className="text-sm text-gray-600">
                  {Math.round((effectParams.intensity || 0.5) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={effectParams.intensity || 0.5}
                onChange={(e) => {
                  const newIntensity = parseFloat(e.target.value);
                  // Update effectParams in App.jsx through a debounced callback
                  const updatedParams = {
                    ...effectParams,
                    intensity: newIntensity,
                  };
                  debouncedUpdateEffectParams(updatedParams);
                }}
                className="w-full h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>
          </div>
        )}

        {/* Floating Effect Controls - REMOVED */}
        {/* Effect controls have been removed from CameraView as requested */}
      </div>
    </div>
  );
}
