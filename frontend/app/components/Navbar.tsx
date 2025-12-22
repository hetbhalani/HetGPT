"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";
import { UserMenu } from "./UserMenu";

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
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
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    background: 'transparent',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid transparent',
                    boxShadow: 'none'
                }}
            >
                <div className="flex items-center justify-between w-full px-4 md:px-8 py-3.5">
                    {/* Left: Logo */}
                    <div className="flex items-center gap-3">
                        <Image
                            src="/alien.png"
                            alt="HetGPT Logo"
                            width={32}
                            height={32}
                            className="object-contain drop-shadow-md"
                        />
                        <span className="text-xl font-semibold tracking-tight text-slate-100">
                            HetGPT Studio
                        </span>
                    </div>

                    {/* Right: Auth buttons or Avatar */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated && user ? (
                            <UserMenu user={user} logout={handleLogout} />
                        ) : (
                            <>
                                <button
                                    onClick={openLogin}
                                    className="px-4 py-2 text-sm font-medium rounded-full border border-violet-500/40 bg-transparent text-slate-100 hover:bg-violet-600/10 hover:border-violet-400 transition-all duration-200"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={openSignup}
                                    className="px-4 py-2 text-sm font-semibold rounded-full bg-violet-500 text-white shadow-sm hover:bg-violet-400 transition-all duration-200"
                                >
                                    Get started
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
