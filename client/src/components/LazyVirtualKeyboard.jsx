// Lazy load the VirtualKeyboard component
const LazyVirtualKeyboard = (props) => {
  // We'll use dynamic import here
  const VirtualKeyboardComponent = props.VirtualKeyboardComponent;

  if (!VirtualKeyboardComponent) {
    return null;
  }

  // Direct render without Suspense to avoid blocking
  return <VirtualKeyboardComponent {...props} />;
};

export default LazyVirtualKeyboard;
