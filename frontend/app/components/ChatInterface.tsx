"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { MessageBubble } from "./MessageBubble";
import { InputArea } from "./InputArea";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [hasStarted, setHasStarted] = useState(false);

    const handleSendMessage = (content: string) => {
        if (!hasStarted) setHasStarted(true);

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
        };
        setMessages((prev) => [...prev, userMessage]);

        // Simulate AI response (mock)
        setTimeout(() => {
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "This is a simulated response from HetGPT. I am designed to look just like the real thing!",
            };
            setMessages((prev) => [...prev, aiMessage]);
        }, 1000);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground relative">

            {/* Navbar */}
            <Navbar />

            <main className="relative flex h-full w-full flex-col overflow-hidden pt-16">

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    {!hasStarted ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-8 p-8 text-center animate-fadeIn">
                            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                                Welcome to{" "}
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: "linear-gradient(to right, #4b0082, #800080, #ff4500, #ffa500)",
                                        backgroundSize: "200% auto",
                                        animation: "gradientMove 5s linear infinite",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}
                                >
                                    HetGPT
                                </span>
                                .
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
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area (Fixed at bottom when started) */}
                {hasStarted && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4 animate-slideUp">
                        <div className="w-full max-w-2xl px-4">
                            <InputArea onSend={handleSendMessage} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
