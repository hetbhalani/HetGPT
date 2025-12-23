"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { v4 as uuidv4 } from 'uuid';
import Image from "next/image";
import { Navbar } from "./Navbar";
import { MessageBubble } from "./MessageBubble";
import { InputArea } from "./InputArea";
import { AuthModal } from "./AuthModal";
import { useAuth } from "../context/AuthContext";
import { UserMenu } from "./UserMenu";
import { TextShimmer } from '@/app/components/text-shimmer';
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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

function ChatContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Determine state based on route
    const isChatRoute = pathname === '/chat';
    const hasStarted = isChatRoute;

    const [messages, setMessages] = useState<Message[]>([]);
    const [sessionId] = useState(() => uuidv4());
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{ content: string; file?: File } | null>(null);
    const [authMode, setAuthMode] = useState<"login" | "signup">("login");
    const [isInitialized, setIsInitialized] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const { user, isAuthenticated, checkAuth, logout, isLoading: isAuthLoading } = useAuth();

    const isInitializedRef = useRef(false);

    // Handle initialization from sessionStorage or URL query param (fallback)
    useEffect(() => {
        if (isChatRoute && !isInitializedRef.current) {
            // Check session storage first (preferred)
            const pendingQuery = sessionStorage.getItem('pendingQuery');
            const urlQuery = searchParams.get('q');

            const query = pendingQuery || urlQuery;

            if (query) {
                sendMessage(query);
                // Clear storage/params so it doesn't run again on reload
                sessionStorage.removeItem('pendingQuery');

                // If we used URL param, strictly we might want to clean URL but for now just don't re-trigger
            }
            isInitializedRef.current = true;
            setIsInitialized(true);
        }
    }, [isChatRoute, searchParams]);

    // Scroll to bottom effect
    // Scroll to bottom effect
    useEffect(() => {
        if (scrollContainerRef.current && (isLoading || hasStarted)) {
            const scrollContainer = scrollContainerRef.current;
            // Immediate scroll to ensure it reaches the bottom
            setTimeout(() => {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }, 50);
        }
    }, [isLoading, hasStarted]);

    const sendMessage = async (content: string, file?: File) => {
        // Double check route
        if (!isChatRoute) {
            router.push(`/chat?q=${encodeURIComponent(content)}`);
            return;
        }

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
        // Enforce auth check immediately for all users
        if (!isAuthenticated) {
            const isAuthed = await checkAuth();
            if (!isAuthed) {
                setPendingMessage({ content, file });
                setAuthMode("login");
                setShowAuthModal(true);
                return;
            }
        }

        // If authenticated, proceed
        if (!isChatRoute) {
            sessionStorage.setItem('pendingQuery', content);
            router.push('/chat');
            return;
        }

        sendMessage(content, file);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        if (pendingMessage) {
            if (!isChatRoute) {
                // Save to session storage before navigating
                sessionStorage.setItem('pendingQuery', pendingMessage.content);
                router.push('/chat');
            } else {
                sendMessage(pendingMessage.content, pendingMessage.file);
            }
            setPendingMessage(null);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-transparent text-slate-100 relative">
            {/* Persistent Video Background is now in layout.tsx via BackgroundWrapper */}

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
                            HetGPT
                        </span>
                    </div>

                    {/* User Avatar or Auth Buttons */}
                    <div className="flex items-center gap-3">
                        {isAuthLoading ? (
                            <div className="w-10 h-10 flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : isAuthenticated && user ? (
                            <UserMenu user={user} logout={logout} />
                        ) : (
                            <>
                                <button
                                    onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                                    className="cursor-pointer px-6 py-2.5 text-sm font-medium text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 backdrop-blur-sm shadow-sm"
                                >
                                    Log in
                                </button>

                            </>
                        )}
                    </div>
                </header>
            )}

            <main className={`relative flex h-full w-full flex-col overflow-hidden transition-all duration-500 pt-0`} style={{ zIndex: 2 }}>
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
                    {!hasStarted ? (
                        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 p-6 md:p-10 text-center animate-fadeIn">
                            <h1 className="text-4xl md:text-6xl font-mono font-semibold tracking-tight text-slate-50 drop-shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                                Welcome to{" "}
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: "linear-gradient(to right, #5e30a3ff, #5e4ab7ff, #7A85C1, #ffffffff, #7A85C1, #5e4ab7ff, #5e30a3ff)", backgroundSize: "200% auto",
                                        animation: "gradientMove 5s linear infinite",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        filter: "drop-shadow(0 8px 32px rgba(87, 92, 101, 0.9))"
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
                                    className="backdrop-blur-xl rounded-3xl p-1 border border-violet-500/40"
                                >
                                    <InputArea onSend={handleSendMessage} />
                                </div>
                                <p className="mt-3 text-xs text-slate-400">
                                    Start with a question or paste some text. You can attach a PDF to analyze it.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pb-32 pt-24 px-3 md:px-6 animate-slideUp">
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
                                    <div className="flex w-full px-4 md:px-6 py-4 animate-fadeIn justify-start">
                                        <div className="flex items-start gap-3 md:gap-4 max-w-[85%]">
                                            {/* Avatar for Loader */}
                                            <div className="flex shrink-0 flex-col relative items-end">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-sm overflow-hidden bg-transparent">
                                                    <Image
                                                        src="/alien.png"
                                                        alt="HetGPT"
                                                        width={32}
                                                        height={32}
                                                        className="object-contain"
                                                    />
                                                </div>
                                            </div>

                                            {/* Thinking Text */}
                                            <div className="flex">
                                                <div className="bg-white/7 backdrop-blur-xl text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
                                                    <TextShimmerBasic />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-px w-full" />
                            </div>
                        </div>
                    )}
                </div>
                {hasStarted && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center pt-10 pb-4 animate-slideUp z-20">
                        {/* Gradient Blur Background Layer - Bottom aligned */}
                        <div
                            className="absolute top-0 bottom-0 left-0 right-2 bg-black/40 backdrop-blur-md pointer-events-none"
                            style={{
                                maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
                            }}
                        />
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

export function ChatInterface() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>}>
            <ChatContent />
        </Suspense>
    );
}