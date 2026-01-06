"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import clsx from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration = 4000 }: ToastProps) {
    const [isShowing, setIsShowing] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (isVisible) {
            setIsShowing(true);
            // Small delay to ensure the 100% width is rendered before transitioning to 0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setProgress(0);
                });
            });

            const timer = setTimeout(() => {
                setIsShowing(false); // Start exit animation
                setTimeout(onClose, 300); // Wait for animation to finish before unmounting/resetting
            }, duration);
            return () => clearTimeout(timer);
        } else {
            setIsShowing(false);
            setProgress(100);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !isShowing) return null;

    const icons = {
        success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
        error: <AlertCircle className="h-5 w-5 text-rose-400" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
        info: <Info className="h-5 w-5 text-blue-400" />
    };

    const borders = {
        success: "border-emerald-500/20 bg-emerald-500/10",
        error: "border-rose-500/20 bg-rose-500/10",
        warning: "border-amber-500/20 bg-amber-500/10",
        info: "border-blue-500/20 bg-blue-500/10"
    };

    // Glow effects
    const glows = {
        success: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]",
        error: "shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]",
        warning: "shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]",
        info: "shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]"
    };

    return (
        <div
            className={clsx(
                "fixed top-24 right-8 z-[100] flex flex-col items-start overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-300 ease-out transform",
                borders[type],
                glows[type],
                isShowing ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            )}
            role="alert"
        >
            <div className="flex items-center gap-3 px-5 py-4">
                <div className="shrink-0">{icons[type]}</div>
                <p className="text-sm font-medium text-slate-200">{message}</p>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-white/5">
                <div
                    className={clsx("h-full transition-all ease-linear",
                        type === 'success' && "bg-emerald-400",
                        type === 'error' && "bg-rose-400",
                        type === 'warning' && "bg-amber-400",
                        type === 'info' && "bg-blue-400",
                    )}
                    style={{
                        width: `${progress}%`,
                        transitionDuration: `${duration}ms`
                    }}
                />
            </div>
        </div>
    );
}
