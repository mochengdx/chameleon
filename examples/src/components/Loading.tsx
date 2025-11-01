import React from "react";

export type LoadingSpinnerProps = {
  text?: string;
  sizeClass?: string; // e.g. "w-4 h-4" or "w-6 h-6"
  className?: string;
};

export default function LoadingSpinner({
  text = "Loading...",
  sizeClass = "w-4 h-4",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`} role="status" aria-live="polite">
      <span
        className={`${sizeClass} border-2 border-sky-500 border-t-transparent rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
    </div>
  );
}

export { LoadingSpinner };