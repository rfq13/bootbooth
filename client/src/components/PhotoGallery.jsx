import { API_URL } from "../constants";
export default function PhotoGallery({
  photos,
  onSelectPhoto,
  onDeletePhoto,
  currentPhoto,
}) {
  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp)).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = (photo) => {
    const link = document.createElement("a");
    link.href = photo.path;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Galeri Foto</h2>
          <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
            <span className="text-white text-sm font-medium">
              {photos.length} {photos.length === 1 ? "Foto" : "Foto"}
            </span>
          </div>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="p-4">
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 text-lg font-medium mb-2">
              Belum ada foto
            </p>
            <p className="text-gray-400 text-sm">
              Ambil foto pertama Anda untuk memulai
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {photos.map((photo, index) => (
              <div
                key={photo.filename}
                className={`
                  group relative bg-gray-50 rounded-lg overflow-hidden border-2 transition-all duration-200
                  ${
                    currentPhoto?.filename === photo.filename
                      ? "border-primary-500 shadow-md"
                      : "border-transparent hover:border-gray-300 hover:shadow-sm"
                  }
                `}
              >
                {/* Photo Thumbnail */}
                <div
                  className="flex items-center space-x-3 p-3 cursor-pointer"
                  onClick={() => onSelectPhoto(photo)}
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={`${API_URL}${photo.path}`}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {photo.filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(photo.timestamp)}
                    </p>
                    {photo.simulated && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                        Simulasi
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(photo);
                      }}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm("Apakah Anda yakin ingin menghapus foto ini?")
                        ) {
                          onDeletePhoto(photo.filename);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Selected Indicator */}
                {currentPhoto?.filename === photo.filename && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {photos.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm("Apakah Anda yakin ingin menghapus semua foto?")) {
                  photos.forEach((photo) => onDeletePhoto(photo.filename));
                }
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Hapus Semua
            </button>

            <button
              onClick={() => {
                // Create zip file with all photos (placeholder)
                alert("Fitur download semua akan segera tersedia");
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Download Semua
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
