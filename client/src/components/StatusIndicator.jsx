export default function StatusIndicator({ cameraConnected, socketConnected }) {
  return (
    <div className="flex items-center space-x-4 bg-primary-50 p-3 rounded-lg border border-primary-100">
      {/* Camera Status */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            cameraConnected ? "bg-primary-400 animate-pulse" : "bg-primary-300"
          }`}
        ></div>
        <span className="text-sm text-secondary-900">
          Kamera: {cameraConnected ? "Terhubung" : "Tidak Terhubung"}
        </span>
      </div>

      {/* Socket Status */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            socketConnected ? "bg-primary-400 animate-pulse" : "bg-primary-300"
          }`}
        ></div>
        <span className="text-sm text-secondary-900">
          Server: {socketConnected ? "Terhubung" : "Terputus"}
        </span>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-primary-600"></div>
        <span className="text-sm text-secondary-900">
          {cameraConnected ? "Mode Kamera" : "Mode Simulasi"}
        </span>
      </div>
    </div>
  );
}
