"use client";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import Image from "next/image";
import { Navbar } from "./Navbar";
import { MessageBubble } from "./MessageBubble";
import { InputArea } from "./InputArea";
import { AuthModal } from "./AuthModal";
import { useAuth } from "../context/AuthContext";
import { UserMenu } from "./UserMenu";
import { TextShimmer } from '@/components/ui/text-shimmer';

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

function TextShimmerBasic() {
    return (
        <TextShimmer className='font-mono text-md' duration={2}>
            Thinking...
        </TextShimmer>
    );
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [hasStarted, setHasStarted] = useState(false);
    const [sessionId] = useState(() => uuidv4());
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{ content: string; file?: File } | null>(null);
    const [authMode, setAuthMode] = useState<"login" | "signup">("login");
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const { user, isAuthenticated, checkAuth, logout } = useAuth();

    const sendMessage = async (content: string, file?: File) => {
        if (!hasStarted) setHasStarted(true);

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: file ? `${content}\n[Attached: ${file.name}]` : content,
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    query: content,
                    session_id: sessionId,
                    path: null
                })
            });
            const data = await response.json();

            let aiContent: string;
            if (typeof data === 'string') {
                aiContent = data;
            } else if (data.response) {
                aiContent = data.response;
            } else if (data.detail) {
                aiContent = `Error: ${data.detail}`;
            } else {
                aiContent = JSON.stringify(data);
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: aiContent,
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (content: string, file?: File) => {
        // Check if user is already authenticated (e.g., from navbar login)
        if (isAuthenticated) {
            sendMessage(content, file);
            return;
        }

        // If not authenticated, try to check auth (in case of page refresh with valid cookie)
        const isAuthed = await checkAuth();
        if (isAuthed) {
            sendMessage(content, file);
            return;
        }

        // Not authenticated - show auth modal
        setPendingMessage({ content, file });
        setShowAuthModal(true);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        // Send the pending message if there was one
        if (pendingMessage) {
            sendMessage(pendingMessage.content, pendingMessage.file);
            setPendingMessage(null);
        }
    };

    // Smoothly keep the view pinned to the latest messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, isLoading, hasStarted]);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-black text-slate-100 relative">
            {/* Persistent Video Background */}
            <div className="fixed inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ minWidth: '100%', minHeight: '100%' }}
                >
                    <source src="/1222.mp4" type="video/mp4" />
                </video>
                {/* Overlay: subtle gradient for readability on top of video */}
                <div
                    className="absolute inset-0 transition-all duration-700 ease-in-out"
                    style={{
                        background: hasStarted
                            ? 'rgba(3, 7, 18, 0.86)'
                            : 'linear-gradient(to bottom, rgba(15,23,42,0.25) 0%, rgba(3,7,18,0.6) 55%, rgba(3,7,18,0.8) 100%)',
                        backdropFilter: 'blur(18px)',
                    }}
                />
            </div>

            {/* Navbar pinned at the top once the chat starts */}
            {hasStarted && <Navbar />}

            {/* Top Header with Logo and User Avatar - Only for Welcome Screen */}
            {!hasStarted && (
                <header
                    className="fixed top-0 left-0 right-0 z-[10] flex items-center justify-between px-6 py-4"
                    style={{
                        background: 'transparent',
                        backdropFilter: 'blur(8px)',
                        borderBottom: '1px solid transparent'
                    }}
                >
                    {/* Logo and App Name */}
                    <div className="flex items-center gap-3">
                        <Image
                            src="/alien.png"
                            alt="HetGPT Logo"
                            width={36}
                            height={36}
                            className="object-contain drop-shadow-lg"
                        />
                        <span className="text-xl font-semibold tracking-tight text-slate-100 drop-shadow-sm">
                            HetGPT Studio
                        </span>
                    </div>

                    {/* User Avatar or Auth Buttons */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated && user ? (
                            <UserMenu user={user} logout={logout} />
                        ) : (
                            <>
                                <button
                                    onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                                    className="px-4 py-2 text-sm font-medium rounded-full border border-violet-500/40 bg-transparent text-slate-100 hover:bg-violet-600/10 hover:border-violet-400 transition-all duration-200"
                                >
                                    Log in
                                </button>
                                <button
                                    onClick={() => { setAuthMode("signup"); setShowAuthModal(true); }}
                                    className="px-4 py-2 text-sm font-semibold rounded-full bg-violet-500 text-white shadow-sm hover:bg-violet-400 transition-all duration-200"
                                >
                                    Get started
                                </button>
                            </>
                        )}
                    </div>
                </header>
            )}

            <main className={`relative flex h-full w-full flex-col overflow-hidden transition-all duration-500 ${hasStarted ? 'pt-16' : 'pt-0'}`} style={{ zIndex: 2 }}>
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    {!hasStarted ? (
                        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 p-6 md:p-10 text-center animate-fadeIn">
                            <h1 className="text-4xl md:text-6xl font-mono font-semibold tracking-tight text-slate-50 drop-shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                                Welcome to{" "}
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: "linear-gradient(to right, #38bdf8, #6366f1, #a855f7, #ec4899, #f97316, #ec4899, #6366f1, #38bdf8)", backgroundSize: "200% auto",
                                        animation: "gradientMove 5s linear infinite",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        filter: "drop-shadow(0 8px 32px rgba(15, 23, 42, 0.9))"
                                    }}
                                >
                                    HetGPT
                                </span>
                            </h1>
                            <p className="text-base md:text-lg text-slate-300 max-w-xl font-light tracking-wide">
                                Chat with an AI that can understand your documents, answer questions, explain code,
                                and help you think through any idea.
                            </p>

                            {/* Feature cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full mt-2 md:mt-4">
                                <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] px-5 py-4 text-left">
                                    <p className="text-xs font-semibold text-violet-300 uppercase tracking-[0.2em] mb-1">Understand</p>
                                    <p className="text-sm text-slate-100">Upload PDFs and get summaries, question answers, and more.</p>
                                </div>
                                <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] px-5 py-4 text-left">
                                    <p className="text-xs font-semibold text-violet-300 uppercase tracking-[0.2em] mb-1">Create</p>
                                    <p className="text-sm text-slate-100">Draft emails, blog posts, or reports from simple ideas.</p>
                                </div>
                                <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] px-5 py-4 text-left">
                                    <p className="text-xs font-semibold text-violet-300 uppercase tracking-[0.2em] mb-1">Explain</p>
                                    <p className="text-sm text-slate-100">Break down complex topics or summarize them step by step.</p>
                                </div>
                            </div>

                            {/* Primary entry input */}
                            <div className="w-full max-w-2xl mt-4 md:mt-6">
                                <div
                                    className="backdrop-blur-xl rounded-3xl p-1 border border-violet-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-slate-950/80"
                                >
                                    <InputArea onSend={handleSendMessage} />
                                </div>
                                <p className="mt-3 text-xs text-slate-400">
                                    Start with a question or paste some text. You can attach a PDF to analyze it.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pb-32 pt-4 md:pt-8 px-3 md:px-6 animate-slideUp">
                            <div className="w-full max-w-3xl">
                                {messages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                        userName={msg.role === "user" && user ? user.name : undefined}
                                    />
                                ))}
                                {isLoading && (
                                    <div className="pl-14">
                                        <TextShimmerBasic />
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-px w-full" />
                            </div>
                        </div>
                    )}
                </div>
                {hasStarted && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center pt-10 pb-6 animate-slideUp z-20">
                        {/* Gradient mask for input area to blend with scroll */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-slate-900/80 to-transparent pointer-events-none" />
                        <div className="w-full max-w-3xl px-4 relative z-10">
                            <InputArea onSend={handleSendMessage} />
                        </div>
                    </div>
                )}
            </main>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => {
                    setShowAuthModal(false);
                    setPendingMessage(null);
                }}
                onSuccess={handleAuthSuccess}
                initialMode={authMode}
            />
        </div>
    );
}