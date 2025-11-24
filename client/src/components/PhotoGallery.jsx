import { API_URL } from "../constants";
import { useEffect, useRef, useState } from "preact/hooks";
import { route } from "preact-router";

export default function PhotoGallery({
  photos,
  onSelectPhoto,
  onDeletePhoto,
  currentPhoto,
  onRefreshPhotos, // New prop for refreshing photos
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
    link.href = `${API_URL}${photo.path}`;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditPhoto = (photo) => {
    // Navigasi ke TemplateEditor dengan parameter foto
    route(`/editor?photo=${encodeURIComponent(photo.filename)}`);
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

  const handleImageLoad = (photoId) => {
    setLoadedImages((prev) => new Set(prev).add(photoId));
  };

  const handleImageError = (photoId) => {
    setImageErrors((prev) => new Set(prev).add(photoId));
  };

  const isImageLoaded = (photoId) => loadedImages.has(photoId);
  const hasImageError = (photoId) => imageErrors.has(photoId);

  if (!photos || photos.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 text-center border border-primary-200 shadow-soft">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          No Photos Yet
        </h3>
        <p className="text-secondary-600">
          Start capturing memories with your photobooth!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.filename}
            className={`relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 shadow-soft hover:shadow-soft-lg ${
              currentPhoto?.filename === photo.filename
                ? "ring-2 ring-primary-500 shadow-lg"
                : "hover:scale-105"
            }`}
            onClick={() => onSelectPhoto(photo)}
          >
            <div className="aspect-square bg-gradient-to-br from-primary-50 to-primary-100">
              {hasImageError(photo.filename) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-secondary-500">
                    <svg
                      className="w-8 h-8 mx-auto mb-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs">Error loading</p>
                  </div>
                </div>
              ) : (
                <img
                  data-src={`${API_URL}${photo.path}`}
                  alt={`Photo ${photo.filename}`}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isImageLoaded(photo.filename) ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => handleImageLoad(photo.filename)}
                  onError={() => handleImageError(photo.filename)}
                  ref={(el) => {
                    if (
                      el &&
                      observerRef.current &&
                      !isImageLoaded(photo.filename)
                    ) {
                      observerRef.current.observe(el);
                    }
                  }}
                />
              )}
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                <span className="text-white text-xs font-medium truncate drop-shadow-sm">
                  {formatDate(photo.timestamp)}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditPhoto(photo);
                    }}
                    className="bg-blue-500/20 backdrop-blur-sm text-blue-300 p-1 rounded hover:bg-blue-500/30 transition-colors shadow-soft"
                    title="Edit"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(photo);
                    }}
                    className="bg-white/20 backdrop-blur-sm text-white p-1 rounded hover:bg-white/30 transition-colors shadow-soft"
                    title="Download"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePhoto(photo.filename)
                        .then(() => {
                          // Refresh photos after successful deletion
                          if (onRefreshPhotos) {
                            onRefreshPhotos();
                          }
                        })
                        .catch((error) => {
                          console.error("Error deleting photo:", error);
                        });
                    }}
                    className="bg-red-500/20 backdrop-blur-sm text-red-300 p-1 rounded hover:bg-red-500/30 transition-colors shadow-soft"
                    title="Delete"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
