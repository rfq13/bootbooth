import { useRef, useState } from "preact/hooks";
import PhotoBoothTicket from "./templates/PhotoBoothTicket";
import PhotoStrip from "./templates/PhotoStrip";
import DoublePhotoStrip from "./templates/DoublePhotoStrip";
import FramedDoublePhotoStrip from "./templates/FramedDoublePhotoStrip";
import Jeans from "./templates/Jeans";
import YouTube4R from "./templates/YouTube4R";
import Instagram4R from "./templates/Instagram4R";
import { API_URL } from "../constants";

const LayoutPreview = ({
  selectedTemplate,
  slotPhotos,
  eventName,
  date,
  time,
  row,
  seat,
  onBackToTemplateSelection,
  onResetSession,
  onProceedToPrint,
  onOpenSlotPicker,
  showVirtualKeyboard,
  hideVirtualKeyboard,
  currentEditingIndex,
}) => {
  const layoutRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const getPhotoUrls = () => {
    const urls = slotPhotos.map((p) => (p ? `${API_URL}${p.path}` : null));
    return urls;
  };

  const isPrintEnabled =
    slotPhotos.filter(Boolean).length >= selectedTemplate?.requiredPhotos;

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 shadow-soft-lg border border-primary-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-secondary-900">
          Preview Layout: {selectedTemplate?.name}
        </h2>
        <button
          onClick={onBackToTemplateSelection}
          className="px-4 py-2 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors text-sm"
        >
          Ganti Template
        </button>
      </div>

      <div className="flex justify-center">
        {selectedTemplate?.id === "ticket" ? (
          <PhotoBoothTicket
            photos={getPhotoUrls()}
            eventName={eventName}
            date={date}
            time={time}
            row={row}
            seat={seat}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
          />
        ) : selectedTemplate?.id === "strip" ? (
          <PhotoStrip
            photos={getPhotoUrls()}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
          />
        ) : selectedTemplate?.id === "jeans" ? (
          <Jeans
            photos={getPhotoUrls()}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
          />
        ) : selectedTemplate?.id === "youtube4r" ? (
          <YouTube4R
            photos={getPhotoUrls()}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
            showVirtualKeyboard={showVirtualKeyboard}
            hideVirtualKeyboard={hideVirtualKeyboard}
            currentEditingIndex={currentEditingIndex}
          />
        ) : selectedTemplate?.id === "instagram4r" ? (
          <Instagram4R
            photos={getPhotoUrls()}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
          />
        ) : selectedTemplate?.id === "grid4" ? (
          <div
            ref={layoutRef}
            className="grid grid-cols-2 gap-3 w-[600px] h-[900px] bg-white p-4 border border-primary-200 rounded-3xl"
          >
            {getPhotoUrls()
              .slice(0, 4)
              .map((url, idx) => (
                <div
                  key={idx}
                  className="relative bg-gray-100 border-2 border-dashed border-primary-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary-400 transition-colors"
                  onClick={() => onOpenSlotPicker(idx)}
                  style={{ aspectRatio: "3/2" }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`Slot ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary-500">
                      Klik untuk pilih foto
                    </div>
                  )}
                  <div className="absolute bottom-1 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                    {idx + 1}
                  </div>
                </div>
              ))}
          </div>
        ) : selectedTemplate?.id === "doubleStripFramed" ? (
          <FramedDoublePhotoStrip
            photos={getPhotoUrls()}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
          />
        ) : (
          <DoublePhotoStrip
            photos={getPhotoUrls()}
            domRef={layoutRef}
            onClickSlot={onOpenSlotPicker}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={onBackToTemplateSelection}
          className="px-6 py-3 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors"
        >
          Kembali
        </button>
        <button
          onClick={onResetSession}
          className="px-6 py-3 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors"
        >
          Ulangi Sesi
        </button>
        <button
          onClick={async () => {
            if (!isPrintEnabled || isPrinting) return;
            setIsPrinting(true);
            try {
              await onProceedToPrint(layoutRef);
            } finally {
              setIsPrinting(false);
            }
          }}
          disabled={!isPrintEnabled || isPrinting}
          className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
            isPrintEnabled
              ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white hover:from-primary-500 hover:to-primary-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isPrinting ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
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
              Mencetak...
            </>
          ) : (
            "Lanjut ke Cetak"
          )}
        </button>
      </div>
    </div>
  );
};

export default LayoutPreview;
