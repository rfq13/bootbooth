import { API_URL } from "../constants";
import { useEffect, useRef, useState } from "preact/hooks";

export default function PhotoGallery({
  photos,
  onSelectPhoto,
  onDeletePhoto,
  currentPhoto,
}) {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());
  const observerRef = useRef(null);

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
    link.href = `${API_URL}${photo.Path}`;
    link.download = photo.Filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize Intersection Observer once
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              observerRef.current.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleImageLoad = (src) => {
    setLoadedImages((prev) => new Set([...prev, src]));
  };

  const handleImageError = (src) => {
    setImageErrors((prev) => new Set([...prev, src]));
  };

  const setImageRef = (img, src) => {
    if (img && observerRef.current) {
      observerRef.current.observe(img);
    }
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
            {photos.map((photo, index) => {
              const imageSrc = `${API_URL}${photo.Path}`;
              const isLoaded = loadedImages.has(imageSrc);
              const hasError = imageErrors.has(imageSrc);
              const isSelected = currentPhoto?.Filename === photo.Filename;

              return (
                <div
                  key={photo.Filename}
                  className={`
                    group relative bg-gray-50 rounded-lg overflow-hidden border-2 transition-all duration-200
                    ${
                      isSelected
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
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative">
                      {/* Loading Placeholder */}
                      {!isLoaded && !hasError && (
                        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
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
                        </div>
                      )}

                      {/* Error Placeholder */}
                      {hasError && (
                        <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Actual Image */}
                      <img
                        ref={(img) => setImageRef(img, imageSrc)}
                        data-src={imageSrc}
                        alt={photo.Filename}
                        className={`
                          w-full h-full object-cover transition-opacity duration-300
                          ${isLoaded ? "opacity-100" : "opacity-0"}
                          ${hasError ? "hidden" : ""}
                        `}
                        onLoad={() => handleImageLoad(imageSrc)}
                        onError={() => handleImageError(imageSrc)}
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {photo.Filename}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(photo.Timestamp)}
                      </p>
                      {photo.Simulated && (
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
                            confirm(
                              "Apakah Anda yakin ingin menghapus foto ini?"
                            )
                          ) {
                            onDeletePhoto(photo.Filename);
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
                  {isSelected && (
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
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {photos.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={async () => {
                if (confirm("Apakah Anda yakin ingin menghapus semua foto?")) {
                  // Create a copy of the photos array to avoid issues during iteration
                  const photosToDelete = [...photos];
                  for (const photo of photosToDelete) {
                    try {
                      await onDeletePhoto(photo.Filename);
                      // Add a small delay between deletions to avoid overwhelming the server
                      await new Promise((resolve) => setTimeout(resolve, 100));
                    } catch (error) {
                      console.error(
                        "Error deleting photo:",
                        photo.Filename,
                        error
                      );
                      // Continue with other photos even if one fails
                    }
                  }
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
