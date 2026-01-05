"use client";

import { useState, useEffect } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialMode?: "login" | "signup";
}

type AuthMode = "login" | "signup";

const BACKEND_URL = "https://hetgpt.onrender.com";

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "login" }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { setUser } = useAuth();

    // Form fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Sync mode with initialMode prop when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
        }
    }, [isOpen, initialMode]);

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setError("");
    };

    const handleModeSwitch = (newMode: AuthMode) => {
        setMode(newMode);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (mode === "signup") {
            if (!name.trim()) {
                setError("Name is required");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (password.length < 6) {
                setError("Password must be at least 6 characters");
                return;
            }
        }

        setIsLoading(true);

        try {
            const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
            const body = mode === "login"
                ? { email, password }
                : { name, email, password };

            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Authentication failed");
            }

            if (data.access_token) {
                localStorage.setItem("hetgpt_token", data.access_token);
            }

            // Backend returns { id, name, email, message } directly, not nested under 'user'
            setUser({ id: data.id, name: data.name, email: data.email || email });
            resetForm();
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 animate-scaleIn">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2 text-slate-100">
                                {mode === "login" ? "Welcome back" : "Create account"}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {mode === "login" ? "Sign in to continue to HetGPT" : "Sign up to get started with HetGPT"}
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="relative flex mb-6 p-1 rounded-xl bg-slate-900/50 border border-white/5">
                            {/* Sliding Indicator */}
                            <div
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-violet-600 rounded-lg shadow-md transition-transform duration-300 ease-out"
                                style={{
                                    transform: mode === "login" ? "translateX(4px)" : "translateX(calc(100% + 4px))"
                                }}
                            />
                            <button
                                onClick={() => handleModeSwitch("login")}
                                className={`relative flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 z-10 ${mode === "login"
                                    ? "text-white"
                                    : "text-slate-400 hover:text-slate-200"
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => handleModeSwitch("signup")}
                                className={`relative flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-200 z-10 ${mode === "signup"
                                    ? "text-white"
                                    : "text-slate-400 hover:text-slate-200"
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === "signup" && (
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-violet-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/80 transition-all duration-200"
                                        required
                                    />
                                </div>
                            )}

                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-violet-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/80 transition-all duration-200"
                                    required
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-violet-500 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/80 transition-all duration-200"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {mode === "signup" && (
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-violet-500 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/80 transition-all duration-200"
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 px-4 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/20"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    mode === "login" ? "Sign In" : "Create Account"
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <p className="text-center text-sm text-slate-500 mt-6">
                            {mode === "login" ? (
                                <>Don&apos;t have an account?{" "}
                                    <button onClick={() => handleModeSwitch("signup")} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                                        Sign up
                                    </button>
                                </>
                            ) : (
                                <>Already have an account?{" "}
                                    <button onClick={() => handleModeSwitch("login")} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                                        Login
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
