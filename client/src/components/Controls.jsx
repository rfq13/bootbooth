export default function Controls({
  onCapture,
  isCapturing,
  cameraConnected,
  onStartPreview,
  onStopPreview,
  isPreviewActive,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      {/* Main Capture Button */}
      <button
        onClick={() => {
          onCapture();
          onStopPreview();
        }}
        disabled={isCapturing || !cameraConnected}
        className={`group relative flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform ${
          isCapturing || !cameraConnected
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
        } shadow-lg`}
      >
        {isCapturing ? (
          <>
            <svg
              className="animate-spin h-6 w-6 text-white"
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
            <span>Mengambil Foto...</span>
          </>
        ) : (
          <>
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Ambil Foto</span>
          </>
        )}
      </button>

      {/* Preview Toggle Button */}
      <button
        onClick={isPreviewActive ? onStopPreview : onStartPreview}
        disabled={!cameraConnected}
        className={`group relative flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300 transform ${
          !cameraConnected
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : isPreviewActive
            ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:scale-105 hover:shadow-xl hover:shadow-red-500/30 active:scale-95"
            : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 hover:shadow-xl hover:shadow-green-500/30 active:scale-95"
        } shadow-lg`}
        title={isPreviewActive ? "Stop Preview" : "Start Preview"}
      >
        {isPreviewActive ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>Stop Preview</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>Start Preview</span>
          </>
        )}
      </button>
    </div>
  );
}
