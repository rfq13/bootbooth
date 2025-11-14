import { useState, useEffect, useRef } from "preact/hooks";
import PhotoBoothTicket from "./PhotoBoothTicket";
import PhotoStrip from "./PhotoStrip";
import PhotoGallery from "./PhotoGallery";
import { API_URL } from "../constants";

const LayoutPage = ({ onBack }) => {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [eventName, setEventName] = useState("Movie");
  const [date, setDate] = useState("Sunday, May 25th");
  const [time, setTime] = useState("19:30");
  const [row, setRow] = useState("01");
  const [seat, setSeat] = useState("23");
  const [layoutType, setLayoutType] = useState("ticket"); // 'ticket' | 'strip'
  const layoutRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/photos`);
      const data = await response.json();
      if (Array.isArray(data)) setPhotos(data);
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const handleSelectPhoto = (photo) => {
    setCurrentPhoto(photo);
    if (photo && !selectedPhotos.find((p) => p.Filename === photo.Filename)) {
      setSelectedPhotos((prev) => [...prev, photo]);
    }
  };

  const handleRemovePhoto = (filename) => {
    setSelectedPhotos((prev) => prev.filter((p) => p.Filename !== filename));
    if (currentPhoto?.Filename === filename) {
      setCurrentPhoto(null);
    }
  };

  const handleProceedToPrint = async () => {
    if (selectedPhotos.length === 0) {
      alert("Silakan pilih minimal 1 foto terlebih dahulu!");
      return;
    }
    try {
      const { toPng } = await import("html-to-image");
      if (!layoutRef.current) return;
      const dataUrl = await toPng(layoutRef.current, {
        quality: 0.95,
        pixelRatio: 3,
        backgroundColor: layoutType === "ticket" ? "#4a7ba7" : "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `layout-${layoutType}-${Date.now()}.png`;
      link.click();
      alert("Layout berhasil diekspor sebagai gambar!");
    } catch (error) {
      console.error("Error printing image:", error);
      alert("Terjadi kesalahan saat mencetak foto. Silakan coba lagi.");
    }
  };

  const getPhotoUrls = () => {
    return selectedPhotos.map((photo) => `${API_URL}${photo.Path}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white p-8">
      <div className="container mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Pilih Layout Foto
          </h1>
          <p className="text-lg text-secondary-700">
            Pilih foto dan atur layout sebelum mencetak
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Photo Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 shadow-soft-lg border border-primary-200">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Pilih Foto
              </h2>
              <PhotoGallery
                photos={photos}
                currentPhoto={currentPhoto}
                onSelectPhoto={handleSelectPhoto}
                onDeletePhoto={async (filename) => {
                  try {
                    const resp = await fetch(
                      `${API_URL}/api/photos/${filename}`,
                      { method: "DELETE" }
                    );
                    if (resp.ok) {
                      setPhotos((prev) =>
                        prev.filter((ph) => ph.Filename !== filename)
                      );
                      handleRemovePhoto(filename);
                    }
                  } catch (e) {
                    console.error("Delete failed", e);
                  }
                }}
              />

              {/* Selected Photos Preview */}
              {selectedPhotos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-3">
                    Foto Terpilih ({selectedPhotos.length}/3)
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPhotos.map((photo, index) => (
                      <div key={photo.Filename} className="relative group">
                        <img
                          src={`${API_URL}${photo.Path}`}
                          alt={`Selected ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border-2 border-primary-300"
                        />
                        <button
                          onClick={() => handleRemovePhoto(photo.Filename)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 rounded-b-lg">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Layout Settings and Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 shadow-soft-lg border border-primary-200 mb-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">Pengaturan Layout</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">Pilih Jenis Layout</label>
                <div className="flex gap-3">
                  <button
                    className={`px-3 py-2 rounded-lg border ${layoutType === "ticket" ? "bg-primary-100 border-primary-300" : "bg-white border-primary-200"}`}
                    onClick={() => setLayoutType("ticket")}
                  >Ticket (Movie)</button>
                  <button
                    className={`px-3 py-2 rounded-lg border ${layoutType === "strip" ? "bg-primary-100 border-primary-300" : "bg-white border-primary-200"}`}
                    onClick={() => setLayoutType("strip")}
                  >PhotoStrip (BYD)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Nama Event
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Waktu
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Baris
                    </label>
                    <input
                      type="text"
                      value={row}
                      onChange={(e) => setRow(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Kursi
                    </label>
                    <input
                      type="text"
                      value={seat}
                      onChange={(e) => setSeat(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Layout Preview */}
            <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 shadow-soft-lg border border-primary-200">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Preview Layout
              </h2>

              {selectedPhotos.length === 0 ? (
                <div className="text-center py-12 text-secondary-500">
                  <p>
                    Silakan pilih minimal 1 foto untuk melihat preview layout
                  </p>
                </div>
              ) : (
                <div className="flex justify-center">
                  {layoutType === "ticket" ? (
                    <PhotoBoothTicket
                      photos={getPhotoUrls()}
                      eventName={eventName}
                      date={date}
                      time={time}
                      row={row}
                      seat={seat}
                      domRef={layoutRef}
                    />
                  ) : (
                    <PhotoStrip photos={getPhotoUrls()} domRef={layoutRef} />
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={handleProceedToPrint}
                  disabled={selectedPhotos.length === 0}
                  className={`px-6 py-3 rounded-lg transition-colors ${
                    selectedPhotos.length > 0
                      ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white hover:from-primary-500 hover:to-primary-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Lanjut ke Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutPage;
