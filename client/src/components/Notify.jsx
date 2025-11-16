import { useState, useEffect, createContext, useContext } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

// Create context for notify function
const NotifyContext = createContext();

// Custom hook to use notify
export const useNotify = () => {
  const context = useContext(NotifyContext);
  if (!context) {
    throw new Error("useNotify must be used within a NotifyProvider");
  }
  return context;
};

// Notify Provider component
export const NotifyProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const notify = (type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type,
      message,
      duration,
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto remove after duration
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  };

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <NotifyComponent
        notifications={notifications}
        setNotifications={setNotifications}
      />
    </NotifyContext.Provider>
  );
};

const NotifyComponent = ({ notifications, setNotifications }) => {
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "success":
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case "error":
        return <XCircle className={`${iconClass} text-red-500`} />;
      case "warning":
        return <AlertCircle className={`${iconClass} text-yellow-500`} />;
      case "info":
      default:
        return <Info className={`${iconClass} text-blue-500`} />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "warning":
        return "text-yellow-800";
      case "info":
      default:
        return "text-blue-800";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            flex items-center gap-3 p-4 rounded-lg border shadow-lg
            min-w-[300px] max-w-[400px]
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right-full
            ${getBackgroundColor(notification.type)}
          `}
        >
          {getIcon(notification.type)}
          <span
            className={`flex-1 font-medium ${getTextColor(notification.type)}`}
          >
            {notification.message}
          </span>
          <button
            onClick={() => removeNotification(notification.id)}
            className={`p-1 rounded-full hover:bg-black/10 transition-colors ${getTextColor(
              notification.type
            )}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotifyComponent;
