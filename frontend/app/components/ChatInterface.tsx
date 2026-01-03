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
import { TextShimmer } from '../components/text-shimmer';
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
    const [sessionId, setSessionId] = useState(() => searchParams.get('sessionId') || uuidv4());
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{ content: string; file?: File } | null>(null);
    const [authMode, setAuthMode] = useState<"login" | "signup">("login");
    const [isInitialized, setIsInitialized] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { user, isAuthenticated, checkAuth, logout } = useAuth();

    const hasSentQuery = useRef(false);

    // Persist session context on page close/refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (messages.length > 0 && isAuthenticated) {
                // Use fetch with keepalive to ensure the request finishes even if the tab closes
                fetch('https://hetgpt.onrender.com/chat/end-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: "", // Not used by the endpoint for summarization
                        session_id: sessionId
                    }),
                    keepalive: true
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [messages, sessionId, isAuthenticated]);

    const handleNewChat = async () => {
        const oldSessionId = sessionId;
        const hasMessages = messages.length > 0;

        // Reset state for new chat IMMEDIATELY for better UX
        setMessages([]);
        setSessionId(uuidv4());
        hasSentQuery.current = false;

        if (hasMessages && isAuthenticated) {
            console.log("Ending session and summarizing in background...");
            try {
                // We don't await this so the UI stays responsive
                fetch('https://hetgpt.onrender.com/chat/end-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: "",
                        session_id: oldSessionId
                    })
                }).then(res => {
                    if (res.ok) console.log("Session end initiated successfully");
                    else console.error("Session end failed with status:", res.status);
                }).catch(err => {
                    console.error("Failed to end session:", err);
                });
            } catch (error) {
                console.error("Failed to initiate session end:", error);
            }
        }
    };

    // Handle initialization from URL query param
    useEffect(() => {
        if (isChatRoute && !isInitialized && !hasSentQuery.current) {
            const query = searchParams.get('q');
            const urlFilePath = searchParams.get('filePath');

            if (query) {
                hasSentQuery.current = true;
                sendMessage(query, undefined, urlFilePath || undefined);

                // Clear the query from the URL without reloading
                const params = new URLSearchParams(searchParams.toString());
                params.delete('q');
                params.delete('sessionId');
                params.delete('filePath');

                const newQuery = params.toString();
                const newPath = pathname + (newQuery ? `?${newQuery}` : '');
                router.replace(newPath);
            }
            setIsInitialized(true);
        }
    }, [isChatRoute, searchParams, isInitialized, pathname, router]);

    // Scroll to bottom effect
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, isLoading, hasStarted]);

    const sendMessage = async (content: string, file?: File, preUploadedPath?: string) => {
        // Double check route
        if (!isChatRoute) {
            router.push(`/chat?q=${encodeURIComponent(content)}`);
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: file ? `${content}\n[Attached: ${file.name}]` : (preUploadedPath ? `${content}\n[Attached PDF]` : content),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            let filePath: string | null = preUploadedPath || null;

            // If file is attached and not pre-uploaded, upload it first
            if (file && !filePath) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('session_id', sessionId);

                const uploadResponse = await fetch('https://hetgpt.onrender.com/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });

                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json();
                    filePath = uploadData.file_path;
                    console.log('File uploaded successfully:', filePath);
                } else {
                    console.error('File upload failed');
                    const errText = await uploadResponse.text();
                    throw new Error(`File upload failed: ${uploadResponse.status} ${errText}`);
                }
            }

            const response = await fetch('https://hetgpt.onrender.com/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    query: content,
                    session_id: sessionId,
                    path: filePath
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "API Error");
            }

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
        if (!isChatRoute) {
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('session_id', sessionId);

                    const uploadResponse = await fetch('https://hetgpt.onrender.com/upload', {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });

                    if (uploadResponse.ok) {
                        const uploadData = await uploadResponse.json();
                        const filePath = uploadData.file_path;
                        router.push(`/chat?q=${encodeURIComponent(content)}&sessionId=${sessionId}&filePath=${encodeURIComponent(filePath)}`);
                        return;
                    } else {
                        console.error('File upload failed');
                        alert("Failed to upload file. Please try again.");
                        return;
                    }
                } catch (e) {
                    console.error("Upload error", e);
                    alert("Error uploading file.");
                    return;
                }
            }
            router.push(`/chat?q=${encodeURIComponent(content)}`);
            return;
        }

        if (isAuthenticated) {
            sendMessage(content, file);
            return;
        }

        const isAuthed = await checkAuth();
        if (isAuthed) {
            sendMessage(content, file);
            return;
        }

        setPendingMessage({ content, file });
        setShowAuthModal(true);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        if (pendingMessage) {
            if (!isChatRoute) {
                router.push(`/chat?q=${encodeURIComponent(pendingMessage.content)}`);
            } else {
                sendMessage(pendingMessage.content, pendingMessage.file);
            }
            setPendingMessage(null);
        }
    };

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
            {hasStarted && <Navbar onNewChat={handleNewChat} />}

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
                    <div className="flex items-center gap-6">
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

                        {messages.length > 0 && (
                            <button
                                onClick={handleNewChat}
                                className="cursor-pointer flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                New Chat
                            </button>
                        )}
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

            <main className={`relative flex h-full w-full flex-col overflow-hidden transition-all duration-500 pt-0`} style={{ zIndex: 2 }}>
                <div className="flex-1 overflow-y-auto scroll-smooth">
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
                                                <div className="bg-slate-900/80 backdrop-blur-xl text-slate-100 rounded-2xl rounded-tl-sm px-3 md:px-4 py-2.5 border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.9)]">
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
                            className="absolute inset-0 w-full h-full bg-black/40 backdrop-blur-md pointer-events-none"
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