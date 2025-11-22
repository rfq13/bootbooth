import { useState, useEffect } from "preact/hooks";
import PhotoGallery from "./PhotoGallery";
import { API_URL } from "../constants";

const PhotoSelectionModal = ({
  isOpen,
  onClose,
  onSelectPhoto,
  activeSlot,
  photos,
  onRefreshPhotos,
}) => {
  const [currentPhoto, setCurrentPhoto] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPhoto(null);
    }
  }, [isOpen]);

  const handleSelectPhoto = (photo) => {
    setCurrentPhoto(photo);
    onSelectPhoto(photo, activeSlot);
    onClose();
  };

  const handleDeletePhoto = async (filename) => {
    try {
      const resp = await fetch(`${API_URL}/api/photos/${filename}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        onRefreshPhotos();
      }
      return resp;
    } catch (e) {
      console.error("Delete failed", e);
      throw e;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[90vw] max-w-4xl shadow-soft-lg border border-primary-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">
            Pilih Foto untuk Slot {activeSlot !== null ? activeSlot + 1 : ""}
          </h3>
          <button
            className="px-3 py-1 rounded-lg bg-secondary-200 text-secondary-800 hover:bg-secondary-300 transition-colors"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
        <PhotoGallery
          photos={photos}
          currentPhoto={currentPhoto}
          onSelectPhoto={handleSelectPhoto}
          onDeletePhoto={handleDeletePhoto}
          onRefreshPhotos={onRefreshPhotos}
        />
      </div>
    </div>
  );
};

export default PhotoSelectionModal;
