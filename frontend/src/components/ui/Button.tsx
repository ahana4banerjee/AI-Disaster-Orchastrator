import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyle =
    "inline-flex items-center justify-center font-semibold tracking-wide transition duration-150 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-accent-primary hover:bg-indigo-750 text-white border border-transparent",
    secondary: "bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-custom",
    danger: "bg-severity-extreme hover:bg-red-700 text-white border border-transparent",
    outline: "bg-transparent hover:bg-bg-secondary text-text-primary border border-border-custom",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[11px] h-9",
    md: "px-4 py-2.5 text-xs h-11",
    lg: "px-6 py-3 text-xs h-12",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
