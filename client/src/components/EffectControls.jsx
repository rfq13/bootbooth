import React from "react";
import { usePhotoBooth } from "../context/PhotoBoothContext";

const EFFECTS = [
  { id: "none", name: "Normal", icon: "📷", hasParams: false },
  { id: "grayscale", name: "B&W", icon: "🖤", hasParams: false },
  { id: "sepia", name: "Sepia", icon: "🤎", hasParams: false },
  { id: "blur", name: "Blur", icon: "💫", hasParams: true, hasRadius: true },
  { id: "brightness", name: "Bright", icon: "☀️", hasParams: true, hasIntensity: true },
  { id: "contrast", name: "Contrast", icon: "🎯", hasParams: true, hasIntensity: true },
  { id: "saturate", name: "Saturate", icon: "🌈", hasParams: true, hasIntensity: true },
  { id: "hue-rotate", name: "Hue", icon: "🎨", hasParams: true, hasIntensity: true },
  { id: "invert", name: "Invert", icon: "🔄", hasParams: false },
  { id: "pixelate", name: "Pixel", icon: "🔲", hasParams: true, hasPixelSize: true },
  { id: "fisheye", name: "Fish Eye", icon: "🐟", hasParams: true, hasIntensity: true },
  { id: "vintage", name: "Vintage", icon: "📸", hasParams: true, hasIntensity: true },
  { id: "cold", name: "Cold", icon: "❄️", hasParams: true, hasIntensity: true },
  { id: "warm", name: "Warm", icon: "🔥", hasParams: true, hasIntensity: true },
  { id: "dramatic", name: "Drama", icon: "🎭", hasParams: true, hasIntensity: true },
];

export default function EffectControls() {
  const { currentEffect, setEffect, effectParams, setEffectParams } = usePhotoBooth();

  const params = effectParams[currentEffect] || {};
  const currentEffectData = EFFECTS.find((e) => e.id === currentEffect) || EFFECTS[0];

  const updateParam = (key, value) => {
    setEffectParams((prev) => ({
      ...prev,
      [currentEffect]: {
        ...prev[currentEffect],
        [key]: value,
      },
    }));
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <span>🎨</span>
          <span>Efek Kamera</span>
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Aktif:</span>
          <span className="text-sm font-medium text-orange-600">
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
                  ? "border-orange-200 bg-gradient-to-br from-orange-100 via-yellow-100 to-amber-100 text-gray-800 shadow-lg transform scale-105"
                  : "border-white/30 bg-white/40 hover:bg-orange-50 text-gray-700 backdrop-blur-sm"
              }
            `}
            title={effect.name}
          >
            <span className="text-2xl">{effect.icon}</span>
            <span className="text-xs font-medium text-center">
              {effect.name}
            </span>
            {currentEffect === effect.id && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      {/* Effect Parameters */}
      {currentEffectData.hasParams && (
        <div className="space-y-4 border-t border-white/20 pt-4">
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
                className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-400"
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
                className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-400"
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
                className="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>
          )}
        </div>
      )}

      {/* Effect Description */}
      <div className="mt-4 p-3 bg-white/40 rounded-lg backdrop-blur-sm">
        <p className="text-xs text-gray-600">
          <strong>Tips:</strong> Efek akan diterapkan secara real-time pada
          preview dan foto yang di-capture. Beberapa efek seperti Fish Eye dan
          Blur mungkin mempengaruhi performa pada resolusi tinggi.
        </p>
      </div>
    </div>
  );
}
