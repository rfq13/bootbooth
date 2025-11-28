import { useState, useEffect, useRef } from "preact/hooks";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";

const VirtualKeyboard = ({
  isVisible = false,
  onInputChange,
  onHide,
  initialValue = "",
}) => {
  // Virtual Keyboard state
  const [keyboardInput, setKeyboardInput] = useState(initialValue);

  const keyboardRef = useRef(null);

  // Initialize keyboard
  useEffect(() => {
    if (isVisible && !keyboardRef.current) {
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
              "{space}",
            ],
            shift: [
              "! @ # $ % ^ & * ( ) {backspace}",
              "Q W E R T Y U I O P {delete}",
              "A S D F G H J K L {enter}",
              "{shift} Z X C V B N M , . ? ! @ # {arrowleft} {arrowup} {arrowdown} {arrowright}",
              "{space}",
            ],
            capslock: [
              "1 2 3 4 5 6 7 8 9 0 {backspace}",
              "Q W E R T Y U I O P {delete}",
              "{capslock} A S D F G H J K L {enter}",
              "{shift} Z X C V B N M , . ? ! @ # {arrowleft} {arrowup} {arrowdown} {arrowright}",
              "{space}",
            ],
            symbols: [
              "[ ] { } # $ % ^ & * + = {backspace}",
              "\\ | / < > : ; \" ' {delete}",
              "{abc} {numbers} - _ ( ) {enter}",
              ", . ? ! @ {arrowleft} {arrowup} {arrowdown} {arrowright}",
            ],
          },
          display: {
            "{backspace}": "⌫",
            "{enter}": "✓",
            "{delete}": "⌦",
            "{capslock}": "⇪",
            "{shift}": "⇑",
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
    } else if (!isVisible && keyboardRef.current) {
      keyboardRef.current.destroy();
      keyboardRef.current = null;
    }
  }, [isVisible]);

  // Cleanup keyboard on unmount
  useEffect(() => {
    return () => {
      if (keyboardRef.current) {
        keyboardRef.current.destroy();
      }
    };
  }, []);

  // Update keyboard input when initialValue changes
  useEffect(() => {
    setKeyboardInput(initialValue);
    if (keyboardRef.current && isVisible) {
      setTimeout(() => {
        keyboardRef.current.setInput(initialValue);
      }, 150);
    }
  }, [initialValue, isVisible]);

  // Keyboard functions

  const handleKeyboardChange = (input) => {
    console.log("Keyboard input changed:", input);
    setKeyboardInput(input);
    if (onInputChange && typeof onInputChange === "function") {
      onInputChange(input);
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
    console.log("Key pressed:", button);
    if (button === "{enter}") {
      // Enter berfungsi sama dengan "Selesai"
      if (onHide) onHide();
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
    } else {
      // For regular character keys, let simple-keyboard handle the onChange event
      console.log("Regular key pressed, letting onChange handle it");
    }
  };

  if (!isVisible) return null;

  return (
    <>
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
            onClick={onHide}
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
          width: 450px; /* Increased width */
          max-width: 450px; /* Increased width */
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
          background-color: #555;
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

export default VirtualKeyboard;

// Export named export untuk memudahkan dynamic import
export { VirtualKeyboard };
