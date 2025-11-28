import { useRef, useState } from "preact/hooks";
import { Loader2 } from "lucide-react";
import PhotoBoothTicket from "./templates/PhotoBoothTicket";
import Yedam from "./templates/Yedam";
import DoublePhotoStrip from "./templates/DoublePhotoStrip";
import FramedDoublePhotoStrip from "./templates/FramedDoublePhotoStrip";
import Jeans from "./templates/Jeans";
import YouTube4R from "./templates/YouTube4R";
import Instagram4R from "./templates/Instagram4R";
import SpiderMan from "./templates/SpiderMan";
import Love4R from "./templates/Love4R";
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
  is2RCombined,
  selectedSecondTemplate,
  useSingle2R,
}) => {
  const layoutRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const getPhotoUrls = () => {
    const urls = slotPhotos.map((p) => (p ? `${API_URL}${p.path}` : null));
    return urls;
  };

  // Calculate total required photos for combined 2R templates
  const getTotalRequiredPhotos = () => {
    if (is2RCombined && selectedSecondTemplate) {
      return (
        selectedTemplate.requiredPhotos + selectedSecondTemplate.requiredPhotos
      );
    }
    return selectedTemplate?.requiredPhotos || 0;
  };

  const isPrintEnabled =
    slotPhotos.filter(Boolean).length >= getTotalRequiredPhotos();

  // Helper function to render individual templates
  const renderTemplate = (template, photos, slotOffset = 0) => {
    const adjustedOnClickSlot = (slotIndex) =>
      onOpenSlotPicker(slotIndex + slotOffset);

    if (template?.id === "ticket") {
      return (
        <PhotoBoothTicket
          photos={photos}
          eventName={eventName}
          date={date}
          time={time}
          row={row}
          seat={seat}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    if (template?.id === "yedam") {
      return (
        <Yedam
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    if (template?.id === "jeans") {
      return (
        <Jeans
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    if (template?.id === "youtube4r") {
      return (
        <YouTube4R
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
          showVirtualKeyboard={showVirtualKeyboard}
          hideVirtualKeyboard={hideVirtualKeyboard}
          currentEditingIndex={currentEditingIndex}
        />
      );
    }
    if (template?.id === "instagram4r") {
      return (
        <Instagram4R
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    if (template?.id === "grid4") {
      return (
        <div
          ref={layoutRef}
          className="grid grid-cols-2 gap-3 w-[600px] h-[900px] bg-white p-4 border border-primary-200 rounded-3xl"
        >
          {photos.slice(0, 4).map((url, idx) => (
            <div
              key={idx}
              className="relative bg-gray-100 border-2 border-dashed border-primary-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => adjustedOnClickSlot(idx)}
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
      );
    }
    if (template?.id === "doubleStripFramed") {
      return (
        <FramedDoublePhotoStrip
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    if (template?.id === "spiderMan") {
      return (
        <SpiderMan
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    if (template?.id === "love4r") {
      return (
        <Love4R
          photos={photos}
          domRef={layoutRef}
          onClickSlot={adjustedOnClickSlot}
        />
      );
    }
    return (
      <DoublePhotoStrip
        photos={photos}
        domRef={layoutRef}
        onClickSlot={adjustedOnClickSlot}
      />
    );
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-3xl p-6 shadow-soft-lg border border-primary-200 w-[600px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-secondary-900 text-wrap max-w-[400px]">
            Preview Layout: {selectedTemplate?.name}
          </h2>
          {is2RCombined && selectedSecondTemplate && (
            <p className="text-sm text-secondary-600 mt-1">
              + {selectedSecondTemplate.name} (Template 2R Kedua)
            </p>
          )}
          {useSingle2R && selectedTemplate?.type === "2R" && (
            <p className="text-sm text-secondary-600 mt-1">
              (Single 2R - akan ada space kosong)
            </p>
          )}
        </div>
        <button
          onClick={onBackToTemplateSelection}
          className="px-4 py-2 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors text-sm"
        >
          Ganti Template
        </button>
      </div>

      <div className="flex justify-center">
        {/* Combined 2R Templates - Display side by side */}
        {is2RCombined && selectedSecondTemplate ? (
          <div
            ref={layoutRef}
            className="flex gap-4 bg-white border-2 border-primary-200"
            style={{ width: "fit-content" }}
          >
            {/* First 2R Template */}
            <div className="relative">
              {renderTemplate(
                selectedTemplate,
                getPhotoUrls().slice(0, selectedTemplate.requiredPhotos),
                0
              )}
              {!isPrinting && (
                <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full print:hidden">
                  Template 1
                </div>
              )}
            </div>

            {/* Second 2R Template */}
            <div className="relative">
              {renderTemplate(
                selectedSecondTemplate,
                getPhotoUrls().slice(selectedTemplate.requiredPhotos),
                selectedTemplate.requiredPhotos
              )}
              {!isPrinting && (
                <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full print:hidden">
                  Template 2
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single Template (including single 2R) */
          renderTemplate(selectedTemplate, getPhotoUrls(), 0)
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
              <Loader2 className="animate-spin h-4 w-4 text-white" />
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
