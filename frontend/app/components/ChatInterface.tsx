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
import { Toast, ToastType } from "./Toast";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getDeviceId } from "../../lib/deviceId";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Helper to get auth headers for cross-domain requests
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("access_token");
    if (token) {
        return { "Authorization": `Bearer ${token}` };
    }
    return {};
};

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

    // Rate limiting state
    const [remainingPrompts, setRemainingPrompts] = useState(5);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [deviceId, setDeviceId] = useState<string>('');
    const deviceIdRef = useRef<string>('');
    const lastRateLimitRequestRef = useRef(0);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: "",
        type: "info",
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = "info") => {
        setToast({ message, type, isVisible: true });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const { user, isAuthenticated, checkAuth, logout, isLoading: isAuthLoading } = useAuth();

    // Initialize device ID and check rate limit on mount
    useEffect(() => {
        const id = getDeviceId();
        console.log('[RATE_LIMIT] Device ID:', id);
        setDeviceId(id);
        deviceIdRef.current = id;
        if (id) {
            // Skip initial check if there's a pending query param — sendMessage
            // will call checkRateLimit after success, avoiding a race condition
            // where this early check overwrites the post-decrement value.
            const hasPendingQuery = new URLSearchParams(window.location.search).get('q');
            if (!hasPendingQuery) {
                checkRateLimit(id);
            }
        }
    }, []);

    // Function to check rate limit status
    const checkRateLimit = async (devId: string) => {
        const requestId = ++lastRateLimitRequestRef.current;
        console.log('[RATE_LIMIT] Checking rate limit for device:', devId);
        try {
            const response = await fetch(`${BACKEND_URL}/rate-limit/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: devId })
            });
            console.log('[RATE_LIMIT] Response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('[RATE_LIMIT] Response data:', data);
                if (requestId !== lastRateLimitRequestRef.current) {
                    return;
                }
                setRemainingPrompts(data.remaining_prompts);
                setIsRateLimited(data.is_rate_limited);
            } else {
                console.error('[RATE_LIMIT] Response not ok:', await response.text());
            }
        } catch (error) {
            console.error('[RATE_LIMIT] Failed to check rate limit:', error);
        }
    };

    const hasSentQuery = useRef(false);

    // Persist session context on page close/refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (messages.length > 0 && isAuthenticated) {
                // Use fetch with keepalive to ensure the request finishes even if the tab closes
                fetch(`${BACKEND_URL}/chat/end-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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

    // Prefetch chat route for faster transition
    useEffect(() => {
        if (!isChatRoute) {
            router.prefetch('/chat');
        }
    }, [isChatRoute, router]);

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
                fetch(`${BACKEND_URL}/chat/end-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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

    // Initialize LTM when authenticated
    useEffect(() => {
        if (isAuthenticated && sessionId) {
            fetch(`${BACKEND_URL}/chat/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                credentials: 'include',
                body: JSON.stringify({
                    query: "", // Unused
                    session_id: sessionId
                })
            }).catch(err => console.error("LTM init failed", err));
        }
    }, [isAuthenticated, sessionId]);

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

    // Scroll to bottom helper
    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    };

    // Scroll to bottom effect
    useEffect(() => {
        scrollToBottom();
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

        // Immediate scroll to bottom after adding user message
        setTimeout(() => scrollToBottom(), 100);

        try {
            let filePath: string | null = preUploadedPath || null;

            // If file is attached and not pre-uploaded, upload it first
            if (file && !filePath) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('session_id', sessionId);

                const uploadResponse = await fetch(`${BACKEND_URL}/upload`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders(),
                    body: formData
                });

                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json();
                    filePath = uploadData.file_path;
                    console.log('File uploaded successfully:', filePath);
                } else {
                    console.error('File upload failed');
                    // Try to parse JSON error first, then fallback to text
                    let errorMessage = "File upload failed";
                    try {
                        const errData = await uploadResponse.json();
                        errorMessage = errData.detail || errorMessage;
                    } catch {
                        const errText = await uploadResponse.text();
                        if (errText) errorMessage = `${errorMessage}: ${errText}`;
                    }
                    throw new Error(errorMessage);
                }
            }

            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                credentials: 'include',
                body: JSON.stringify({
                    query: content,
                    session_id: sessionId,
                    path: filePath,
                    device_id: deviceIdRef.current
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                // Handle rate limit error
                if (response.status === 429) {
                    const remainingFromServer = errData?.detail?.remaining_prompts;
                    setRemainingPrompts(typeof remainingFromServer === 'number' ? remainingFromServer : 0);
                    setIsRateLimited(true);
                    throw new Error(errData.detail?.message || "Daily prompt limit reached. Try again tomorrow!");
                }
                throw new Error(errData.detail || "API Error");
            }

            const data = await response.json();

            if (typeof data.remaining_prompts === 'number') {
                setRemainingPrompts(data.remaining_prompts);
                setIsRateLimited(data.remaining_prompts <= 0);
            }

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

            // Refresh rate limit state after non-429 errors to keep UI synced with backend.
            if (deviceIdRef.current) {
                checkRateLimit(deviceIdRef.current);
            }

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: error instanceof Error ? error.message : "Sorry, something went wrong. Please try again.",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const executeSend = async (content: string, file?: File) => {
        // Check rate limit before sending
        if (isRateLimited) {
            showToast("Daily prompt limit reached. Try again tomorrow!", "warning");
            return;
        }

        if (!isChatRoute) {
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('session_id', sessionId);

                    const uploadResponse = await fetch(`${BACKEND_URL}/upload`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: getAuthHeaders(),
                        body: formData
                    });

                    if (uploadResponse.ok) {
                        const uploadData = await uploadResponse.json();
                        const filePath = uploadData.file_path;
                        router.push(`/chat?q=${encodeURIComponent(content)}&sessionId=${sessionId}&filePath=${encodeURIComponent(filePath)}`);
                        return;
                    } else {
                        console.error('File upload failed');
                        let errorMessage = "Failed to upload file. Please try again.";
                        try {
                            const errData = await uploadResponse.json();
                            errorMessage = errData.detail || errorMessage;
                        } catch { /* ignore parse error */ }

                        // Custom short messages for better UI
                        if (errorMessage.includes("exceeds page limit")) {
                            showToast("File too large (Max 50 pages)", "warning");
                        } else {
                            showToast(errorMessage, "error");
                        }
                        return;
                    }
                } catch (e) {
                    console.error("Upload error", e);
                    showToast("Error uploading file.", "error");
                    return;
                }
            }
            router.push(`/chat?q=${encodeURIComponent(content)}`);
            return;
        } else {
            sendMessage(content, file);
        }
    };

    const handleSendMessage = async (content: string, file?: File) => {
        if (isAuthenticated) {
            await executeSend(content, file);
            return;
        }

        const isAuthed = await checkAuth();
        if (isAuthed) {
            await executeSend(content, file);
            return;
        }

        setPendingMessage({ content, file });
        setShowAuthModal(true);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        showToast("Logged in successfully!", "success");
        if (pendingMessage) {
            // Directly execute send since we just successfully logged in
            executeSend(pendingMessage.content, pendingMessage.file);
            setPendingMessage(null);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-black text-slate-100 relative">
            {/* Mobile/Tablet Static Image Background */}
            <div className="fixed inset-0 z-0 lg:hidden">
                <Image
                    src="/mobile_static.png"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Dark blur overlay for chat page on mobile */}
                {hasStarted && <div className="chat-mobile-overlay" />}
            </div>

            {/* Persistent Video Background (Desktop only) */}
            <div className="fixed inset-0 z-0 hidden lg:block">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    disablePictureInPicture
                    disableRemotePlayback
                    controls={false}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                        minWidth: '100%',
                        minHeight: '100%',
                        objectFit: 'cover'
                    }}
                    // @ts-ignore - webkit specific attribute
                    webkit-playsinline="true"
                >
                    <source src="/1222.mp4" type="video/mp4" />
                </video>
                {/* Overlay: subtle gradient for readability on top of video */}
                <div
                    className="absolute inset-0 transition-all duration-700 ease-in-out"
                    style={{
                        background: hasStarted
                            ? 'rgba(3, 7, 18, 0.86)'
                            : 'linear-gradient(to bottom, rgba(24, 15, 42, 0.25) 0%, rgba(30, 19, 50, 0.6) 55%, rgba(37, 23, 62, 0.8) 100%)',
                        backdropFilter: 'blur(18px)',
                    }}
                />
            </div>

            {/* Navbar pinned at the top once the chat starts */}
            {hasStarted && <Navbar onNewChat={handleNewChat} isGenerating={isLoading} remainingPrompts={remainingPrompts} />}

            {/* Top Header with Logo and User Avatar - Only for Welcome Screen */}
            {
                !hasStarted && (
                    <header
                        className="fixed top-0 left-0 right-0 z-[10] flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4"
                        style={{
                            background: 'transparent',
                            backdropFilter: 'blur(8px)',
                            borderBottom: '1px solid transparent'
                        }}
                    >
                        {/* Logo and App Name */}
                        <div className="flex items-center gap-3 sm:gap-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Image
                                    src="/alien.png"
                                    alt="HetGPT Logo"
                                    width={36}
                                    height={36}
                                    className="object-contain drop-shadow-lg w-7 h-7 sm:w-9 sm:h-9"
                                />
                                <span className="text-lg sm:text-xl font-mono font-semibold tracking-tight text-slate-100 drop-shadow-sm">
                                    HetGPT
                                </span>
                            </div>

                            {messages.length > 0 && (
                                <button
                                    onClick={handleNewChat}
                                    disabled={isLoading}
                                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium border rounded-lg transition-all duration-300 ${isLoading
                                        ? "text-slate-500 bg-white/5 border-white/5 cursor-not-allowed opacity-50"
                                        : "cursor-pointer text-slate-200 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    <span className="hidden sm:inline">New Chat</span>
                                </button>
                            )}
                        </div>

                        {/* User Avatar or Auth Buttons */}
                        <div className="flex items-center gap-3">
                            {isAuthLoading ? (
                                <div className="flex items-center justify-center w-20 h-10">
                                    <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                        className="cursor-pointer px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 backdrop-blur-sm shadow-sm"
                                    >
                                        Log in
                                    </button>
                                </>
                            )}
                        </div>
                    </header>
                )
            }

            <main className={`relative flex h-full w-full flex-col overflow-hidden transition-all duration-500 pt-0`} style={{ zIndex: 2 }}>
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth" style={{ position: "relative" }}>
                    {!hasStarted ? (
                        <div className="welcome-container flex min-h-screen w-full flex-col items-center justify-start lg:justify-center gap-4 sm:gap-6 md:gap-8 pt-32 pb-10 sm:py-10 px-4 sm:px-6 md:p-10 text-center animate-fadeIn scroll-mt-20">
                            {/* Pre-warm the chat route (compilation trigger) */}
                            <div style={{ display: 'none' }} aria-hidden="true">
                                <iframe src="/chat" tabIndex={-1} title="Preloader" />
                            </div>

                            <h1 className="welcome-heading text-2xl sm:text-4xl md:text-6xl font-mono font-semibold tracking-tight text-slate-50 drop-shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                                <span>Welcome to</span><span className="welcome-break"> </span>
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: "linear-gradient(to right, #ffffff, #906effff, #ffffff)",
                                        backgroundSize: "200% auto",
                                        animation: "gradientMove 5s linear infinite",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        filter: "drop-shadow(0 0 8px rgba(165, 180, 252, 0.3))"
                                    }}
                                >
                                    HetGPT
                                </span>
                            </h1>
                            <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-xl font-light tracking-wide px-2">
                                Chat with an AI that can understand your documents, answer questions, explain code,
                                and help you think through any idea.
                            </p>

                            {/* Feature cards */}
                            <div className="feature-cards-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full mt-2 md:mt-4">
                                <div className="rounded-xl sm:rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] px-3 sm:px-5 py-3 sm:py-4 text-left">
                                    <p className="text-[10px] sm:text-xs font-semibold text-violet-300 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1">PDF Analysis</p>
                                    <p className="text-xs sm:text-sm text-slate-100">Upload PDFs and ask questions, get summaries, or extract key insights.</p>
                                </div>
                                <div className="rounded-xl sm:rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] px-3 sm:px-5 py-3 sm:py-4 text-left">
                                    <p className="text-[10px] sm:text-xs font-semibold text-violet-300 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1">Live Data</p>
                                    <p className="text-xs sm:text-sm text-slate-100">Access real-time web data for news, weather, stocks, and more.</p>
                                </div>
                                <div className="rounded-xl sm:rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)] px-3 sm:px-5 py-3 sm:py-4 text-left sm:col-span-2 md:col-span-1">
                                    <p className="text-[10px] sm:text-xs font-semibold text-violet-300 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1">CS & Conversation</p>
                                    <p className="text-xs sm:text-sm text-slate-100">Solve coding problems, write code and chat casually with AI.</p>
                                </div>
                            </div>

                            {/* Primary entry input */}
                            <div className="w-full max-w-2xl mt-4 md:mt-6">
                                <div
                                    className="backdrop-blur-xl rounded-3xl p-1 border border-violet-500/40"
                                >
                                    <InputArea onSend={handleSendMessage} isLoading={isLoading} remainingPrompts={remainingPrompts} isRateLimited={isRateLimited} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="chat-messages-container flex flex-col items-center pb-10 pt-16 sm:pt-20 md:pt-24 px-2 sm:px-3 md:px-6 animate-slideUp">
                            <div className="w-full max-w-4xl">
                                {messages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                        userName={msg.role === "user" && user ? user.name : undefined}
                                    />
                                ))}
                                {isLoading && (
                                    <div className="flex w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 animate-fadeIn justify-start">
                                        <div className="flex items-start gap-2 sm:gap-3 md:gap-4 max-w-[90%] sm:max-w-[85%]">
                                            {/* Avatar for Loader */}
                                            <div className="flex shrink-0 flex-col relative items-end">
                                                <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-sm overflow-hidden bg-transparent">
                                                    <Image
                                                        src="/alien.png"
                                                        alt="HetGPT"
                                                        width={32}
                                                        height={32}
                                                        className="object-contain w-6 h-6 sm:w-8 sm:h-8"
                                                    />
                                                </div>
                                            </div>

                                            {/* Thinking Text */}
                                            <div className="flex">
                                                <div className="bg-white/7 backdrop-blur-md text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10 shadow-sm">
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
                    <div className="w-full flex justify-center pb-1 relative" style={{ zIndex: 20 }}>
                        <div className="w-full max-w-4xl px-2 sm:px-4 flex flex-col items-center gap-1">
                            <InputArea onSend={handleSendMessage} isLoading={isLoading} remainingPrompts={remainingPrompts} isRateLimited={isRateLimited} />
                            <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-light tracking-wide text-center px-2">
                                HetGPT can make mistakes. Important info should be verified.
                            </p>
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

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />
        </div >
    );
}

export function ChatInterface() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>}>
            <ChatContent />
        </Suspense>
    );
}