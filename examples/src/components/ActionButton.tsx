import React from "react";

export function ActionButton({
    children,
    onClick,
    className = "",
}: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
}) {
    const base =
        "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
    const primary = "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500";
    return (
        <button onClick={onClick} className={`${base} ${primary} ${className}`}>
            {children}
        </button>
    );
}

// Optional secondary button style
export function SecondaryActionButton({
    children,
    onClick,
    className = "",
}: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
}) {
    const base =
        "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
    const secondary = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50";
    return (
        <button onClick={onClick} className={`${base} ${secondary} ${className}`}>
            {children}
        </button>
    );
}