"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";
import { UserMenu } from "./UserMenu";

interface NavbarProps {
    onNewChat?: () => void;
    isGenerating?: boolean;
    remainingPrompts?: number;
    maxPrompts?: number;
}

export function Navbar({ onNewChat, isGenerating, remainingPrompts = 5, maxPrompts = 5 }: NavbarProps) {
    const { user, isAuthenticated, logout, isLoading } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "signup">("login");

    const openLogin = () => {
        setAuthMode("login");
        setShowAuthModal(true);
    };

    const openSignup = () => {
        setAuthMode("signup");
        setShowAuthModal(true);
    };

    const handleLogout = async () => {
        await logout();
    };

    // Calculate ring progress
    const progress = (remainingPrompts / maxPrompts) * 100;
    const circumference = 2 * Math.PI * 14; // radius = 14
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Color based on remaining prompts
    const getRingColor = () => {
        if (remainingPrompts <= 1) return '#ef4444'; // red
        if (remainingPrompts <= 2) return '#f59e0b'; // amber
        return '#8b5cf6'; // violet
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50">
                {/* Gradient Blur Background Layer */}
                <div
                    className="absolute inset-0 w-full h-full bg-black/40 backdrop-blur-md"
                    style={{
                        maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)'
                    }}
                />

                {/* Navbar Content */}
                <div className="relative flex items-center justify-between w-full px-3 sm:px-6 py-3 sm:py-5">
                    {/* Left: Logo, New Chat, and Rate Limit Ring */}
                    <div className="flex items-center gap-3 sm:gap-6">
                        <Link href="/" className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                            <Image
                                src="/alien.png"
                                alt="HetGPT Logo"
                                width={36}
                                height={36}
                                className="w-7 h-7 sm:w-9 sm:h-9"
                            />
                            <span className="text-lg sm:text-xl font-mono font-bold tracking-tight text-white drop-shadow-md">
                                HetGPT
                            </span>
                        </Link>

                        {onNewChat && (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={onNewChat}
                                    disabled={isGenerating}
                                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium border rounded-lg transition-all duration-300 ${isGenerating
                                        ? "text-slate-500 bg-white/5 border-white/5 cursor-not-allowed opacity-50"
                                        : "cursor-pointer text-slate-200 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    <span className="hidden sm:inline">New Chat</span>
                                </button>

                                {/* Rate Limit Ring Indicator */}
                                <div className="relative group">
                                    <svg className="w-8 h-8 sm:w-9 sm:h-9 -rotate-90" viewBox="0 0 36 36">
                                        {/* Background circle */}
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="14"
                                            fill="transparent"
                                            stroke="rgba(255,255,255,0.1)"
                                            strokeWidth="3"
                                        />
                                        {/* Progress circle */}
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="14"
                                            fill="transparent"
                                            stroke={getRingColor()}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            className="transition-all duration-500"
                                        />
                                    </svg>
                                    {/* Number in center */}
                                    <span
                                        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                                        style={{ color: getRingColor() }}
                                    >
                                        {remainingPrompts}
                                    </span>

                                    {/* Tooltip */}
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-slate-900/95 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-lg z-50">
                                        {remainingPrompts} prompt{remainingPrompts !== 1 ? 's' : ''} left today
                                        <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-slate-900/95 rotate-45 border-l border-t border-white/10"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Auth buttons or Avatar */}
                    <div className="flex items-center gap-5">
                        {isLoading ? (
                            // Loading state spinner
                            <div className="w-10 h-10 flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : isAuthenticated && user ? (
                            <UserMenu user={user} logout={handleLogout} />
                        ) : (
                            <>
                                <button
                                    onClick={openLogin}
                                    className="cursor-pointer px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 backdrop-blur-sm shadow-sm"
                                >
                                    Log in
                                </button>

                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={() => setShowAuthModal(false)}
                initialMode={authMode}
            />
        </>
    );
}
