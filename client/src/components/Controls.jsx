export default function Controls({
  onCapture,
  isCapturing,
  cameraConnected,
  onStartPreview,
  onStopPreview,
  isPreviewActive,
}) {
  return (
    <div className="mt-6 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        {/* Main Capture Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              onCapture();
              onStopPreview();
            }}
            disabled={isCapturing || !cameraConnected}
            className={`btn-gradient rounded-full px-8 py-4 text-white font-semibold shadow-lg transition-all duration-200 transform ${
              isCapturing || !cameraConnected
                ? "opacity-50 cursor-not-allowed grayscale"
                : "hover:scale-105 active:scale-95"
            }`}
          >
            <div className="flex items-center space-x-3">
              {isCapturing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-white font-semibold text-lg">
                    Mengambil Foto...
                  </span>
                </>
              ) : (
                <>
                  <svg
                className="w-7 h-7 text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-white font-semibold text-lg">
                    Ambil Foto
                  </span>
                </>
              )}
            </div>

            {/* Pulse animation for camera connected */}
            {cameraConnected && !isCapturing && (
              <div className="absolute inset-0 rounded-xl bg-primary-400 animate-ping opacity-20"></div>
            )}
          </button>
        </div>

        {/* Camera Status */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div
              className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                cameraConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></div>
            <p className="text-xs text-white/70 font-medium">
              {cameraConnected ? "Kamera Terhubung" : "Kamera Tidak Terhubung"}
            </p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {isCapturing ? "⏳" : "📸"}
            </div>
            <p className="text-xs text-white/70 font-medium">
              {isCapturing ? "Proses..." : "Siap"}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {/* Preview Toggle Button */}
          <button
            onClick={isPreviewActive ? onStopPreview : onStartPreview}
            disabled={!cameraConnected}
            className={`rounded-full px-5 py-2 shadow flex flex-col items-center justify-center min-w-[100px] transition-all ${
              !cameraConnected
                ? "bg-gray-200/60 text-gray-500 cursor-not-allowed"
                : isPreviewActive
                ? "bg-gradient-to-r from-red-400 to-rose-300 text-gray-800 hover:opacity-90"
                : "bg-gradient-to-r from-green-300 to-emerald-200 text-gray-800 hover:opacity-90"
            }`}
            title={isPreviewActive ? "Stop Preview" : "Start Preview"}
          >
            {isPreviewActive ? (
              <>
                <svg
                  className="w-5 h-5 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="text-xs font-medium">Stop</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs font-medium">Preview</span>
              </>
            )}
          </button>

          <button
            className="p-3 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
            title="Timer 5 detik"
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          <button
            className="p-3 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
            title="Burst Mode"
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>

          <button
            className="p-3 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
            title="Filter"
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Instructions */}
      {!cameraConnected && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                <strong>Mode Simulasi:</strong> Kamera tidak terdeteksi.
                Aplikasi akan berjalan dalam mode simulasi.
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Hubungkan kamera yang kompatibel dengan gPhoto2 untuk mode
                kamera nyata.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {cameraConnected && (
        <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-white/80 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-white/80">
                <strong>Tips:</strong> Pastikan pencahayaan cukup dan posisi
                kamera stabil untuk hasil terbaik.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
