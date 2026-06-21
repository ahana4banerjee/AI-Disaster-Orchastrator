import React, { useEffect } from "react";
import { X, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

export interface ToastProps {
  message: string;
  type: "success" | "warning" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    success: "bg-bg-secondary border-l-4 border-l-severity-low border-border-custom text-text-primary",
    warning: "bg-bg-secondary border-l-4 border-l-severity-moderate border-border-custom text-text-primary",
    error: "bg-bg-secondary border-l-4 border-l-severity-extreme border-border-custom text-text-primary"
  };

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-severity-low shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-severity-moderate shrink-0" />,
    error: <ShieldAlert className="h-4 w-4 text-severity-extreme shrink-0" />
  };

  return (
    <div className={`fixed top-6 right-6 z-50 max-w-sm rounded-xl p-4 border shadow-md flex items-start gap-3 transition-all duration-300 ${typeStyles[type]}`}>
      {icons[type]}
      <div className="flex-1 text-[11px] font-semibold leading-relaxed">
        {message}
      </div>
      <button 
        onClick={onClose} 
        className="text-text-muted hover:text-text-primary cursor-pointer shrink-0"
        title="Dismiss Notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
