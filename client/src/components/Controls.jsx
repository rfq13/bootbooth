export default function Controls({
  onCapture,
  isCapturing,
  cameraConnected,
  onStartPreview,
  onStopPreview,
  isPreviewActive,
}) {
  return (
    <div className="inline-flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
      {/* Main Capture Button */}
      <button
        onClick={() => {
          onCapture();
          onStopPreview();
        }}
        disabled={isCapturing || !cameraConnected}
        className={`flex items-center justify-center px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-soft-lg ${
          isCapturing || !cameraConnected
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-primary-500 to-primary-700 text-white hover:from-primary-600 hover:to-primary-800 shadow-soft-lg"
        }`}
      >
        <div className="flex items-center space-x-3">
          {isCapturing ? (
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
              <span>Mengambil Foto...</span>
            </>
          ) : (
            <>
              <svg
                className="w-7 h-7 text-white"
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
              <span>Ambil Foto</span>
            </>
          )}
        </div>
      </button>

      {/* Preview Toggle Button */}
      <button
        onClick={isPreviewActive ? onStopPreview : onStartPreview}
        disabled={!cameraConnected}
        className={`flex items-center justify-center px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 shadow-soft-lg ${
          !cameraConnected
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : isPreviewActive
            ? "bg-gradient-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800"
            : "bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800"
        }`}
        title={isPreviewActive ? "Stop Preview" : "Start Preview"}
      >
        {isPreviewActive ? (
          <>
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>Stop Preview</span>
          </>
        ) : (
          <>
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>Start Preview</span>
          </>
        )}
      </button>

      {/* Quick Actions */}
      <div className="flex items-center space-x-2">
        <button
          className="p-3 bg-white/80 backdrop-blur-md text-secondary-700 rounded-lg hover:bg-white transition-colors shadow-soft border border-primary-200"
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
          className="p-3 bg-white/80 backdrop-blur-md text-secondary-700 rounded-lg hover:bg-white transition-colors shadow-soft border border-primary-200"
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
      </div>
    </div>
  );
}
