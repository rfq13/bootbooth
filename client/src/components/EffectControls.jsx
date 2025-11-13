import { useState, useEffect } from "preact/hooks";

const EFFECTS = [
  { id: "none", name: "Normal", icon: "📷", hasParams: false },
  {
    id: "fisheye",
    name: "Fish Eye",
    icon: "🐟",
    hasParams: true,
    hasIntensity: true,
    hasRadius: true,
  },
  { id: "grayscale", name: "Grayscale", icon: "⚫", hasParams: false },
  { id: "sepia", name: "Sepia", icon: "📜", hasParams: false },
  {
    id: "vignette",
    name: "Vignette",
    icon: "🌑",
    hasParams: true,
    hasIntensity: true,
    hasRadius: true,
  },
  { id: "blur", name: "Blur", icon: "💨", hasParams: true, hasIntensity: true },
  { id: "sharpen", name: "Sharpen", icon: "🔪", hasParams: false },
  { id: "invert", name: "Invert", icon: "🔄", hasParams: false },
  {
    id: "pixelate",
    name: "Pixelate",
    icon: "🟦",
    hasParams: true,
    hasPixelSize: true,
  },
];

export default function EffectControls({ socket, onEffectChange }) {
  const [currentEffect, setCurrentEffect] = useState("none");
  const [params, setParams] = useState({
    intensity: 0.5,
    radius: 1.0,
    pixelSize: 10,
  });

  useEffect(() => {
    if (socket) {
      // Request current effect when component mounts
      socket.emit("get-effect");

      // Listen for effect changes from other clients
      socket.on("current-effect", (data) => {
        setCurrentEffect(data.effect || "none");
        // Convert backend params (uppercase) to frontend params (lowercase)
        const convertedParams = {
          intensity: data.params?.Intensity || data.params?.intensity || 0.5,
          radius: data.params?.Radius || data.params?.radius || 1.0,
          pixelSize: data.params?.PixelSize || data.params?.pixelSize || 10,
        };
        setParams(convertedParams);
      });

      socket.on("effectChanged", (data) => {
        setCurrentEffect(data.effect || "none");
        // Convert backend params (uppercase) to frontend params (lowercase)
        const convertedParams = {
          intensity: data.params?.Intensity || data.params?.intensity || 0.5,
          radius: data.params?.Radius || data.params?.radius || 1.0,
          pixelSize: data.params?.PixelSize || data.params?.pixelSize || 10,
        };
        setParams(convertedParams);
        if (onEffectChange) {
          onEffectChange(data.effect, convertedParams);
        }
      });

      return () => {
        socket.off("current-effect");
        socket.off("effectChanged");
      };
    }
  }, [socket, onEffectChange]);

  const setEffect = (effectId) => {
    if (!socket) return;

    const effect = EFFECTS.find((e) => e.id === effectId);
    if (!effect) return;

    // Prepare parameters based on effect type
    const effectParams = {};
    if (effect.hasIntensity) {
      effectParams.intensity = params.intensity;
    }
    if (effect.hasRadius) {
      effectParams.radius = params.radius;
    }
    if (effect.hasPixelSize) {
      effectParams.pixelSize = params.pixelSize;
    }

    socket.emit("set-effect", {
      effect: effectId,
      params: effectParams,
    });

    setCurrentEffect(effectId);
    if (onEffectChange) {
      onEffectChange(effectId, effectParams);
    }
  };

  const updateParam = (paramName, value) => {
    const newParams = { ...params, [paramName]: value };
    setParams(newParams);

    // If we have a current effect that uses this parameter, update it
    if (currentEffect !== "none" && socket) {
      const effect = EFFECTS.find((e) => e.id === currentEffect);
      if (effect) {
        const effectParams = {};
        if (effect.hasIntensity) {
          effectParams.intensity = newParams.intensity;
        }
        if (effect.hasRadius) {
          effectParams.radius = newParams.radius;
        }
        if (effect.hasPixelSize) {
          effectParams.pixelSize = newParams.pixelSize;
        }

        socket.emit("set-effect", {
          effect: currentEffect,
          params: effectParams,
        });

        if (onEffectChange) {
          onEffectChange(currentEffect, effectParams);
        }
      }
    }
  };

  const getCurrentEffectData = () => {
    return EFFECTS.find((e) => e.id === currentEffect) || EFFECTS[0];
  };

  const currentEffectData = getCurrentEffectData();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <span>🎨</span>
          <span>Efek Kamera</span>
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Aktif:</span>
          <span className="text-sm font-medium text-primary-600">
            {currentEffectData.icon} {currentEffectData.name}
          </span>
        </div>
      </div>

      {/* Effect Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {EFFECTS.map((effect) => (
          <button
            key={effect.id}
            onClick={() => setEffect(effect.id)}
            className={`
              relative p-3 rounded-lg border-2 transition-all duration-200
              flex flex-col items-center justify-center space-y-1
              ${
                currentEffect === effect.id
                  ? "border-primary-500 bg-primary-50 text-primary-700 shadow-md transform scale-105"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
              }
            `}
            title={effect.name}
          >
            <span className="text-2xl">{effect.icon}</span>
            <span className="text-xs font-medium text-center">
              {effect.name}
            </span>
            {currentEffect === effect.id && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      {/* Effect Parameters */}
      {currentEffectData.hasParams && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Parameter Efek
          </h4>

          {/* Intensity Slider */}
          {currentEffectData.hasIntensity && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Intensitas
                </label>
                <span className="text-sm text-gray-500">
                  {Math.round((params.intensity || 0.5) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={params.intensity || 0.5}
                onChange={(e) =>
                  updateParam("intensity", parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </div>
          )}

          {/* Radius Slider */}
          {currentEffectData.hasRadius && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Radius
                </label>
                <span className="text-sm text-gray-500">
                  {(params.radius || 1.0).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={params.radius || 1.0}
                onChange={(e) =>
                  updateParam("radius", parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </div>
          )}

          {/* Pixel Size Slider */}
          {currentEffectData.hasPixelSize && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Ukuran Pixel
                </label>
                <span className="text-sm text-gray-500">
                  {params.pixelSize || 10}px
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={params.pixelSize || 10}
                onChange={(e) =>
                  updateParam("pixelSize", parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </div>
          )}
        </div>
      )}

      {/* Effect Description */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Tips:</strong> Efek akan diterapkan secara real-time pada
          preview dan foto yang di-capture. Beberapa efek seperti Fish Eye dan
          Blur mungkin mempengaruhi performa pada resolusi tinggi.
        </p>
      </div>
    </div>
  );
}
