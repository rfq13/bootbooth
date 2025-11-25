import { useState, useEffect, useRef } from "preact/hooks";
import TemplateSelection from "./TemplateSelection";
import TemplateSettings from "./TemplateSettings";
import LayoutPreview from "./LayoutPreview";
import PhotoSelectionModal from "./PhotoSelectionModal";
import { useNotify } from "./Notify";
import { API_URL } from "../constants";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";

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
  const [activeInputCallback, setActiveInputCallback] = useState(null);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const keyboardRef = useRef(null);

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
  ];

  // Initialize keyboard
  useEffect(() => {
    if (showKeyboard && !keyboardRef.current) {
      // Tunggu sebentar untuk memastikan DOM siap
      setTimeout(() => {
        keyboardRef.current = new Keyboard({
          onChange: (input) => handleKeyboardChange(input),
          onKeyPress: (button) => handleKeyboardKeyPress(button),
          theme: "hg-theme-default hg-theme-ios",
          layout: {
            default: [
              "1 2 3 4 5 6 7 8 9 0 {backspace}",
              "q w e r t y u i o p {delete}",
              "{capslock} a s d f g h j k l {enter}",
              "{shift} z x c v b n m , . ? ! @ # {arrowleft} {arrowup} {arrowdown} {arrowright}",
            ],
            shift: [
              "! @ # $ % ^ & * ( ) {backspace}",
              "Q W E R T Y U I O P {delete}",
              "{capslock} A S D F G H J K L {enter}",
              "{shift} Z X C V B N M , . ? ! @ # {arrowleft} {arrowup} {arrowdown} {arrowright}",
            ],
            capslock: [
              "1 2 3 4 5 6 7 8 9 0 {backspace}",
              "Q W E R T Y U I O P {delete}",
              "{capslock} A S D F G H J K L {enter}",
              "{shift} Z X C V B N M , . ? ! @ # {arrowleft} {arrowup} {arrowdown} {arrowright}",
            ],
            symbols: [
              "[ ] { } # $ % ^ & * + = {backspace}",
              "\\ | / < > : ; \" ' {delete}",
              "{abc} {numbers} - _ ( ) {enter}",
              "{space} , . ? ! @ {arrowleft} {arrowup} {arrowdown} {arrowright}",
            ],
          },
          display: {
            "{backspace}": "⌫",
            "{enter}": "✓",
            "{delete}": "⌦",
            "{capslock}": "⇪",
            "{shift}": "⇧",
            "{arrowleft}": "←",
            "{arrowup}": "↑",
            "{arrowdown}": "↓",
            "{arrowright}": "→",
            "{space}": "SPACE",
            "{numbers}": "123",
            "{symbols}": "#+=",
            "{abc}": "ABC",
          },
          mergeDisplay: true,
          autoUseTouchEvents: true,
          preventMouseDownDefault: true,
        });

        // Set initial value
        if (keyboardRef.current && keyboardInput) {
          keyboardRef.current.setInput(keyboardInput);
        }
      }, 100);
    } else if (!showKeyboard && keyboardRef.current) {
      keyboardRef.current.destroy();
      keyboardRef.current = null;
    }
  }, [showKeyboard]);

  // Cleanup keyboard on unmount
  useEffect(() => {
    return () => {
      if (keyboardRef.current) {
        keyboardRef.current.destroy();
      }
    };
  }, []);

  // Keyboard functions
  const showVirtualKeyboard = (
    initialValue = "",
    callback,
    editingIndex = null
  ) => {
    setKeyboardInput(initialValue);
    setActiveInputCallback(() => callback);
    setCurrentEditingIndex(editingIndex);
    setShowKeyboard(true);

    // Update keyboard input setelah keyboard muncul
    setTimeout(() => {
      if (keyboardRef.current) {
        keyboardRef.current.setInput(initialValue);
      }
    }, 150);
  };

  const hideVirtualKeyboard = () => {
    setShowKeyboard(false);
    setKeyboardInput("");
    setActiveInputCallback(null);
    setCurrentEditingIndex(null);
  };

  const handleKeyboardChange = (input) => {
    setKeyboardInput(input);
    if (activeInputCallback && currentEditingIndex !== null) {
      activeInputCallback(input);
    }
  };

  const handleCursorNavigation = (direction) => {
    // Find the active input element
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === "INPUT") {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;

      switch (direction) {
        case "left":
          if (start > 0) {
            activeElement.setSelectionRange(start - 1, start - 1);
          }
          break;
        case "right":
          if (end < activeElement.value.length) {
            activeElement.setSelectionRange(end + 1, end + 1);
          }
          break;
        case "up":
          // Move to beginning of current word or line
          const wordStart = Math.max(0, start - 1);
          activeElement.setSelectionRange(wordStart, wordStart);
          break;
        case "down":
          // Move to end of current word or line
          const wordEnd = Math.min(activeElement.value.length, end + 1);
          activeElement.setSelectionRange(wordEnd, wordEnd);
          break;
      }
    }
  };

  const handleKeyboardKeyPress = (button) => {
    if (button === "{enter}") {
      // Enter berfungsi sama dengan "Selesai"
      hideVirtualKeyboard();
    } else if (button === "{arrowleft}") {
      handleCursorNavigation("left");
    } else if (button === "{arrowright}") {
      handleCursorNavigation("right");
    } else if (button === "{arrowup}") {
      handleCursorNavigation("up");
    } else if (button === "{arrowdown}") {
      handleCursorNavigation("down");
    } else if (button === "{delete}") {
      // Handle delete key (delete forward)
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === "INPUT") {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const value = activeElement.value;

        if (start === end) {
          // Delete one character forward
          const newValue = value.slice(0, start) + value.slice(start + 1);
          activeElement.value = newValue;
          handleKeyboardChange(newValue);
        } else {
          // Delete selected text
          const newValue = value.slice(0, start) + value.slice(end);
          activeElement.value = newValue;
          activeElement.setSelectionRange(start, start);
          handleKeyboardChange(newValue);
        }
      }
    } else if (
      button === "{shift}" ||
      button === "{capslock}" ||
      button === "{numbers}" ||
      button === "{symbols}" ||
      button === "{abc}"
    ) {
      // Handle layout changes
      if (keyboardRef.current) {
        const currentLayoutName = keyboardRef.current.options.layoutName;
        if (button === "{shift}") {
          keyboardRef.current.setOptions({
            layoutName: currentLayoutName === "shift" ? "default" : "shift",
          });
        } else if (button === "{capslock}") {
          keyboardRef.current.setOptions({
            layoutName:
              currentLayoutName === "capslock" ? "default" : "capslock",
          });
        } else if (button === "{numbers}") {
          keyboardRef.current.setOptions({
            layoutName: "default",
          });
        } else if (button === "{symbols}") {
          keyboardRef.current.setOptions({
            layoutName: "symbols",
          });
        } else if (button === "{abc}") {
          keyboardRef.current.setOptions({
            layoutName: "default",
          });
        }
      }
    }
  };

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

      {/* Virtual Keyboard */}
      {showKeyboard && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
          <div className="keyboard-container">
            <div
              className="simple-keyboard"
              style={{
                height: "320px",
                padding: "10px",
                backgroundColor: "#1a1a1a",
                borderRadius: "8px 8px 0 0",
              }}
            />
          </div>
          <div className="flex justify-end p-2">
            <button
              onClick={hideVirtualKeyboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm mr-2"
            >
              Selesai
            </button>
            <button
              onClick={() => {
                if (keyboardRef.current) {
                  keyboardRef.current.clearInput();
                  handleKeyboardChange("");
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Hapus Semua
            </button>
          </div>
        </div>
      )}

      {/* Custom styles for keyboard */}
      <style jsx>{`
        .simple-keyboard .hg-theme-default {
          background-color: #1a1a1a;
          border-radius: 8px;
        }

        .simple-keyboard .hg-button {
          background-color: #333;
          border: 1px solid #555;
          color: white;
          border-radius: 4px;
          font-size: 14px;
          height: 40px;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .simple-keyboard .hg-button:hover {
          background-color: #444;
        }

        .simple-keyboard .hg-button:active {
          background-color: #555;
        }

        .simple-keyboard .hg-function-btn {
          background-color: #2a2a2a;
        }

        .simple-keyboard .hg-function-btn:hover {
          background-color: #3a3a3a;
        }

        .simple-keyboard .hg-button.hg-selectedButton {
          background-color: #4a90e2;
        }

        /* Special styling for space button */
        .simple-keyboard .hg-button[data-skbtn="{space}"] {
          width: 250px;
          max-width: 250px;
          background-color: #444;
          font-size: 12px;
        }

        /* Special styling for arrow buttons - di paling kanan */
        .simple-keyboard .hg-button[data-skbtn^="{arrow"] {
          background-color: #2a2a2a;
          font-size: 16px;
          font-weight: bold;
          width: 40px;
          max-width: 40px;
        }

        /* Special styling for capslock button */
        .simple-keyboard .hg-button[data-skbtn="{capslock}"] {
          background-color: #666;
          width: 80px;
          max-width: 80px;
        }

        /* Special styling for shift button */
        .simple-keyboard .hg-button[data-skbtn="{shift}"] {
          background-color: #666;
          width: 80px;
          max-width: 80px;
        }

        /* Special styling for enter button */
        .simple-keyboard .hg-button[data-skbtn="{enter}"] {
          background-color: #28a745;
          width: 60px;
          max-width: 60px;
        }

        /* Special styling for delete button */
        .simple-keyboard .hg-button[data-skbtn="{delete}"] {
          background-color: #dc3545;
          width: 60px;
          max-width: 60px;
        }

        /* Special styling for backspace button */
        .simple-keyboard .hg-button[data-skbtn="{backspace}"] {
          background-color: #ff6b35;
          width: 80px;
          max-width: 80px;
        }

        /* Special styling for number/symbol toggle buttons */
        .simple-keyboard .hg-button[data-skbtn="{numbers}"],
        .simple-keyboard .hg-button[data-skbtn="{symbols}"],
        .simple-keyboard .hg-button[data-skbtn="{abc}"] {
          background-color: #666;
          width: 60px;
          max-width: 60px;
        }

        /* Special styling for character buttons @ and # */
        .simple-keyboard .hg-button[data-skbtn="@"] {
          background-color: #4a90e2;
        }

        .simple-keyboard .hg-button[data-skbtn="#"] {
          background-color: #4a90e2;
        }
      `}</style>
    </>
  );
};

export default LayoutPage;
