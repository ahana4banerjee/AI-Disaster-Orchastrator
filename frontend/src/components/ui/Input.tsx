import React from "react";

interface BaseInputProps {
  label?: string;
  required?: boolean;
  error?: string;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseInputProps {}

export function Input({
  label,
  required,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={id} className="block text-text-secondary text-[11px] font-bold uppercase tracking-wider">
          {label} {required && <span className="text-severity-extreme ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        required={required}
        className={`w-full h-12 bg-bg-secondary border ${
          error ? "border-severity-extreme" : "border-border-custom"
        } focus:border-accent-primary rounded-xl px-4 text-text-primary text-xs outline-hidden transition duration-150 focus:ring-1 focus:ring-accent-primary/20 ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-severity-extreme font-semibold mt-0.5">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {}

export function TextArea({
  label,
  required,
  error,
  className = "",
  id,
  ...props
}: TextAreaProps) {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={id} className="block text-text-secondary text-[11px] font-bold uppercase tracking-wider">
          {label} {required && <span className="text-severity-extreme ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={id}
        required={required}
        className={`w-full bg-bg-secondary border ${
          error ? "border-severity-extreme" : "border-border-custom"
        } focus:border-accent-primary rounded-xl p-4 text-text-primary text-xs outline-hidden transition duration-150 focus:ring-1 focus:ring-accent-primary/20 min-h-[100px] resize-y ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-severity-extreme font-semibold mt-0.5">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseInputProps {
  children: React.ReactNode;
}

export function Select({
  label,
  required,
  error,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={id} className="block text-text-secondary text-[11px] font-bold uppercase tracking-wider">
          {label} {required && <span className="text-severity-extreme ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        className={`w-full h-12 bg-bg-secondary border ${
          error ? "border-severity-extreme" : "border-border-custom"
        } focus:border-accent-primary rounded-xl px-4 text-text-primary text-xs outline-hidden transition duration-150 focus:ring-1 focus:ring-accent-primary/20 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[10px] text-severity-extreme font-semibold mt-0.5">{error}</p>}
    </div>
  );
}
