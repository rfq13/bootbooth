import { useState, useEffect } from "preact/hooks";
import LazyVirtualKeyboard from "./LazyVirtualKeyboard";

const VirtualKeyboardLoader = (props) => {
  const [VirtualKeyboardComponent, setVirtualKeyboardComponent] =
    useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadVirtualKeyboard = async () => {
      try {
        // Dynamic import untuk code splitting
        const module = await import("./VirtualKeyboard.jsx");
        if (isMounted) {
          setVirtualKeyboardComponent(() => module.default);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("Error loading VirtualKeyboard:", error);
      }
    };

    // Preload keyboard component saat component pertama kali mount
    // tapi hanya render saat dibutuhkan
    if (!isLoaded) {
      loadVirtualKeyboard();
    }

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array is correct

  // Jika keyboard tidak visible, tidak perlu render apa-apa
  if (!props.isVisible) {
    return null;
  }

  // Jika keyboard visible tapi belum loaded, tampilkan loading
  if (!isLoaded || !VirtualKeyboardComponent) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Loading keyboard...</div>
        </div>
      </div>
    );
  }

  // Jika sudah loaded, render VirtualKeyboard dengan lazy loading
  return (
    <LazyVirtualKeyboard
      {...props}
      VirtualKeyboardComponent={VirtualKeyboardComponent}
    />
  );
};

export default VirtualKeyboardLoader;
