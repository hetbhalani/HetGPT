"use client";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Navbar } from "./Navbar";
import { MessageBubble } from "./MessageBubble";
import { InputArea } from "./InputArea";
import { AuthModal } from "./AuthModal";
import { useAuth } from "../context/AuthContext";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [hasStarted, setHasStarted] = useState(false);
    const [sessionId] = useState(() => uuidv4());
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{ content: string; file?: File } | null>(null);

    const { isAuthenticated, checkAuth } = useAuth();

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
        // Check authentication on first message
        if (!hasStarted) {
            const isAuthed = await checkAuth();
            if (!isAuthed) {
                // Store pending message and show auth modal
                setPendingMessage({ content, file });
                setShowAuthModal(true);
                return;
            }
        }

        // User is authenticated, send the message
        sendMessage(content, file);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        // Send the pending message if there was one
        if (pendingMessage) {
            sendMessage(pendingMessage.content, pendingMessage.file);
            setPendingMessage(null);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground relative">
            <Navbar />
            <main className="relative flex h-full w-full flex-col overflow-hidden pt-16">
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    {!hasStarted ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-8 p-8 text-center animate-fadeIn">
                            <h1 className="text-6xl md:text-6xl font-bold tracking-tight">
                                Welcome to{" "}
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: "linear-gradient(to right, #4b0082, #800080, #ff4500, #ffa500, #ff4500, #800080, #4b0082)",
                                        backgroundSize: "200% auto",
                                        animation: "gradientMove 3s linear infinite",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}
                                >
                                    HetGPT
                                </span>
                            </h1>
                            <div className="w-full max-w-2xl">
                                <InputArea onSend={handleSendMessage} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pb-32 pt-4 md:pt-10 px-4 animate-slideUp">
                            <div className="w-full max-w-2xl">
                                {messages.map((msg) => (
                                    <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
                                ))}
                                {isLoading && (
                                    <div className="text-muted-foreground">Thinking...</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {hasStarted && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4 animate-slideUp">
                        <div className="w-full max-w-2xl px-4">
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
            />
        </div>
    );
}