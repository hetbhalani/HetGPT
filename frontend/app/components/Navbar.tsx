"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";
import { UserMenu } from "./UserMenu";

interface NavbarProps {
    onNewChat?: () => void;
    isGenerating?: boolean; // New prop
}

export function Navbar({ onNewChat, isGenerating }: NavbarProps) {
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
                <div className="relative flex items-center justify-between w-full px-6 py-5">
                    {/* Left: Logo and New Chat */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/alien.png"
                                alt="HetGPT Logo"
                                width={36}
                                height={36}
                            />
                            <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                                HetGPT
                            </span>
                        </div>

                        {onNewChat && (
                            <button
                                onClick={onNewChat}
                                disabled={isGenerating}
                                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium border rounded-lg transition-all duration-300 ${isGenerating
                                        ? "text-slate-500 bg-white/5 border-white/5 cursor-not-allowed opacity-50"
                                        : "cursor-pointer text-slate-200 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                New Chat
                            </button>
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
                                    className="cursor-pointer px-6 py-2.5 text-sm font-medium text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 backdrop-blur-sm shadow-sm"
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
