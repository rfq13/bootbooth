export default function StatusIndicator({ cameraConnected, socketConnected }) {
  return (
    <div className="flex items-center space-x-4">
      {/* Camera Status */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            cameraConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        ></div>
        <span className="text-sm text-gray-600">
          Kamera: {cameraConnected ? "Terhubung" : "Tidak Terhubung"}
        </span>
      </div>

      {/* Socket Status */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            socketConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        ></div>
        <span className="text-sm text-gray-600">
          Server: {socketConnected ? "Terhubung" : "Terputus"}
        </span>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <span className="text-sm text-gray-600">
          {cameraConnected ? "Mode Kamera" : "Mode Simulasi"}
        </span>
      </div>
    </div>
  );
}
