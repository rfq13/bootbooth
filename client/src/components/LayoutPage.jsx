import { useState, useEffect, useRef } from "preact/hooks";
import TemplateSelection from "./TemplateSelection";
import TemplateSettings from "./TemplateSettings";
import LayoutPreview from "./LayoutPreview";
import PhotoSelectionModal from "./PhotoSelectionModal";
import { useNotify } from "./Notify";
import { API_URL } from "../constants";
import VirtualKeyboardLoader from "./VirtualKeyboardLoader";

const LayoutPage = ({ onBack }) => {
  const notify = useNotify();
  // Step management
  const [currentStep, setCurrentStep] = useState(1); // 1: Template Selection, 2: Photo Placement

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Photo placement state
  const [slotPhotos, setSlotPhotos] = useState([null, null, null]);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Template settings
  const [eventName, setEventName] = useState("Movie");
  const [date, setDate] = useState("Sunday, May 25th");
  const [time, setTime] = useState("19:30");
  const [row, setRow] = useState("01");
  const [seat, setSeat] = useState("23");

  // Virtual Keyboard state
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState("");
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const activeInputCallback = useRef(null);

  // Template definitions
  const templates = [
    {
      id: "ticket",
      name: "Movie Ticket",
      description: "Tiket bioskop dengan 3 foto",
      preview: "🎬",
      color: "from-blue-500 to-purple-600",
      requiredPhotos: 3,
      settings: {
        eventName: true,
        date: true,
        time: true,
        row: true,
        seat: true,
      },
    },
    {
      id: "strip",
      name: "Photo Strip",
      description: "Strip foto BYD style",
      preview: "📸",
      color: "from-pink-500 to-rose-600",
      requiredPhotos: 3,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "grid4",
      name: "4R Grid",
      description: "Grid 2x2 untuk 4 foto",
      preview: "🖼️",
      color: "from-green-500 to-teal-600",
      requiredPhotos: 4,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "doubleStrip",
      name: "Double Strip",
      description: "2 strip foto side by side",
      preview: "🎞️",
      color: "from-orange-500 to-red-600",
      requiredPhotos: 6,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "doubleStripFramed",
      name: "Double Strip (Frame)",
      description: "Setiap foto memakai frame PNG",
      preview: "🖼️",
      color: "from-indigo-500 to-blue-600",
      requiredPhotos: 6,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "jeans",
      name: "Jeans",
      description: "Setiap foto memakai frame PNG",
      preview: "🖼️",
      color: "from-yellow-500 to-orange-600",
      requiredPhotos: 6,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "youtube4r",
      name: "YouTube 4R",
      description: "Tampilan mirip YouTube dengan 6 thumbnail",
      preview: "▶️",
      color: "from-red-600 to-gray-700",
      requiredPhotos: 6,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "instagram4r",
      name: "Instagram 4R",
      description: "Feed bergaya Instagram dengan stories dan nav",
      preview: "📷",
      color: "from-pink-500 to-yellow-400",
      requiredPhotos: 6,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
    {
      id: "spiderMan",
      name: "Spider-Man",
      description: "Template bergaya Spider-Man dengan frame brush stroke",
      preview: "🕷️",
      color: "from-red-600 to-blue-600",
      requiredPhotos: 3,
      settings: {
        eventName: false,
        date: false,
        time: false,
        row: false,
        seat: false,
      },
    },
  ];

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const count = selectedTemplate.requiredPhotos;
      setSlotPhotos((prev) => {
        const next = [...prev];
        if (next.length < count) {
          while (next.length < count) next.push(null);
        } else if (next.length > count) {
          next.length = count;
        }
        return next;
      });
    }
  }, [selectedTemplate]);

  const loadPhotos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/photos`);
      const data = await response.json();
      console.log("Loaded photos:", data);
      // Backend returns {photos: [...]}, not direct array
      if (data.photos && Array.isArray(data.photos)) {
        setPhotos(data.photos);
      } else if (Array.isArray(data)) {
        setPhotos(data);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const handleSelectPhoto = (photo, slotIndex) => {
    setSlotPhotos((prev) => {
      const next = [...prev];
      next[slotIndex] = photo;
      return next;
    });
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleContinueToPhotoPlacement = () => {
    if (selectedTemplate) {
      setCurrentStep(2);
    }
  };

  const handleBackToTemplateSelection = () => {
    setCurrentStep(1);
    setSelectedTemplate(null);
    setSlotPhotos([null, null, null]);
  };

  const handleProceedToPrint = async (layoutRef) => {
    if (!selectedTemplate) return;

    const requiredSlots = selectedTemplate.requiredPhotos;
    const filled = slotPhotos.filter(Boolean).length;
    if (filled < requiredSlots) {
      notify(
        "warning",
        `Lengkapi semua ${requiredSlots} slot foto terlebih dahulu!`
      );
      return;
    }
    try {
      const { toPng } = await import("html-to-image");
      if (!layoutRef.current) return;
      const dataUrl = await toPng(layoutRef.current, {
        quality: 0.95,
        pixelRatio: 3,
        backgroundColor:
          selectedTemplate.id === "ticket" ? "#4a7ba7" : "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `layout-${selectedTemplate.id}-${Date.now()}.png`;
      link.click();
      notify("success", "Layout berhasil diekspor sebagai gambar!");
    } catch (error) {
      console.error("Error printing image:", error);
      notify(
        "error",
        "Terjadi kesalahan saat mencetak foto. Silakan coba lagi."
      );
    }
  };

  const handleResetSession = () => {
    setSlotPhotos((prev) => prev.map(() => null));
  };

  const openPhotoModal = (slotIndex) => {
    setActiveSlot(slotIndex);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setActiveSlot(null);
  };

  // Keyboard functions
  const showVirtualKeyboard = (
    initialValue = "",
    callback,
    editingIndex = null
  ) => {
    setKeyboardInput(initialValue);
    setCurrentEditingIndex(editingIndex);
    setShowKeyboard(true);

    activeInputCallback.current = callback;

    // Use the stored keyboard methods if available
    if (window.keyboardMethods && window.keyboardMethods.show) {
      window.keyboardMethods.show(initialValue, callback, editingIndex);
    }
  };

  const hideVirtualKeyboard = () => {
    setShowKeyboard(false);
    setKeyboardInput("");
    setCurrentEditingIndex(null);
    activeInputCallback.current = null;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white p-8">
        <div className="container mx-auto">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">
              {currentStep === 1
                ? "Pilih Template Layout"
                : "Atur Foto untuk Layout"}
            </h1>
            <p className="text-lg text-secondary-700">
              {currentStep === 1
                ? "Pilih template layout yang diinginkan terlebih dahulu"
                : `Template: ${selectedTemplate?.name} - Klik pada slot foto untuk memilih`}
            </p>

            {/* Progress Steps */}
            <div className="flex justify-center items-center mt-6 space-x-4">
              <div
                className={`flex items-center ${
                  currentStep === 1 ? "text-primary-600" : "text-green-600"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === 1
                      ? "bg-primary-600 text-white"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {currentStep === 1 ? "1" : "✓"}
                </div>
                <span className="ml-2 font-medium">Pilih Template</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div
                className={`flex items-center ${
                  currentStep === 2 ? "text-primary-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === 2
                      ? "bg-primary-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  2
                </div>
                <span className="ml-2 font-medium">Atur Foto</span>
              </div>
            </div>
          </header>

          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <>
              <TemplateSelection
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={handleSelectTemplate}
                onContinue={handleContinueToPhotoPlacement}
                onBack={onBack}
              />

              <TemplateSettings
                selectedTemplate={selectedTemplate}
                eventName={eventName}
                date={date}
                time={time}
                row={row}
                seat={seat}
                onEventNameChange={setEventName}
                onDateChange={setDate}
                onTimeChange={setTime}
                onRowChange={setRow}
                onSeatChange={setSeat}
              />
            </>
          )}

          {/* Step 2: Photo Placement */}
          {currentStep === 2 && (
            <div className="flex justify-center">
              <LayoutPreview
                selectedTemplate={selectedTemplate}
                slotPhotos={slotPhotos}
                eventName={eventName}
                date={date}
                time={time}
                row={row}
                seat={seat}
                onBackToTemplateSelection={handleBackToTemplateSelection}
                onResetSession={handleResetSession}
                onProceedToPrint={handleProceedToPrint}
                onOpenSlotPicker={openPhotoModal}
                showVirtualKeyboard={showVirtualKeyboard}
                hideVirtualKeyboard={hideVirtualKeyboard}
                currentEditingIndex={currentEditingIndex}
              />
            </div>
          )}
        </div>
      </div>

      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        isOpen={photoModalOpen}
        onClose={closePhotoModal}
        onSelectPhoto={handleSelectPhoto}
        activeSlot={activeSlot}
        photos={photos}
        onRefreshPhotos={loadPhotos}
      />

      {/* Virtual Keyboard with lazy loading */}
      <VirtualKeyboardLoader
        isVisible={showKeyboard}
        initialValue={keyboardInput}
        onInputChange={(input) => {
          if (activeInputCallback.current) {
            activeInputCallback.current(input);
          }
        }}
        onHide={hideVirtualKeyboard}
      />
    </>
  );
};

export default LayoutPage;
