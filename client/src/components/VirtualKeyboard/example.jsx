import { useState } from "preact/hooks";
import { VirtualKeyboard } from "./index";

// Example component showing how to use VirtualKeyboard with code splitting
const VirtualKeyboardExample = () => {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [eventName, setEventName] = useState("Movie");

  const handleInputChange = (input) => {
    // Store the keyboard methods for later use
    window.keyboardMethods = input;
  };

  const handleInputFocus = (value, setter) => {
    setInputValue(value);
    setShowKeyboard(true);

    // Set up callback to update the correct field
    if (window.keyboardMethods) {
      window.keyboardMethods.setCurrentInput(value);
      window.activeInputSetter = setter;
    }
  };

  // Update the active field when keyboard input changes
  const handleKeyboardInput = (value) => {
    setInputValue(value);
    if (window.activeInputSetter) {
      window.activeInputSetter(value);
    }
  };

  // Set up keyboard input callback
  useState(() => {
    if (window.keyboardMethods) {
      window.keyboardMethods.getCurrentInput = () => inputValue;
      window.keyboardMethods.setCurrentInput = handleKeyboardInput;
    }
  });

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">
        VirtualKeyboard Code Splitting Example
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Event Name:</label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            onFocus={() => handleInputFocus(eventName, setEventName)}
            className="w-full p-2 border rounded"
            placeholder="Click to show keyboard..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Custom Input:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => handleInputFocus(inputValue, setInputValue)}
            className="w-full p-2 border rounded"
            placeholder="Click to show keyboard..."
          />
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Current State:</h3>
          <p>Event Name: {eventName}</p>
          <p>Custom Input: {inputValue}</p>
          <p>Keyboard Visible: {showKeyboard ? "Yes" : "No"}</p>
        </div>
      </div>

      {/* Lazy-loaded VirtualKeyboard */}
      <VirtualKeyboard
        isVisible={showKeyboard}
        onInputChange={handleInputChange}
        onHide={() => setShowKeyboard(false)}
        initialValue={inputValue}
      />
    </div>
  );
};

export default VirtualKeyboardExample;
