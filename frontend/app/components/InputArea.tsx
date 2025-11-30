"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp, Mic } from "lucide-react";
import { clsx } from "clsx";

interface InputAreaProps {
    onSend: (message: string) => void;
}

export function InputArea({ onSend }: InputAreaProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    return (
        <div className="mx-auto w-full">
            <div className="relative flex w-full flex-col rounded-3xl border border-border bg-muted/50 backdrop-blur-xl transition-all duration-300 focus-within:border-purple-500/30 focus-within:bg-muted/70 focus-within:shadow-md focus-within:shadow-purple-500/10">

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message HetGPT..."
                    className="max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-12 py-4 text-base focus:outline-none scrollbar-hide"
                    rows={1}
                />

                {/* Attachment Button (Left) */}
                <button className="absolute left-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-background hover:text-foreground transition-colors">
                    <Paperclip className="h-5 w-5" />
                </button>

                {/* Send Button (Right) */}
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    {!input.trim() && (
                        <button className="rounded-full p-2 text-muted-foreground hover:bg-background hover:text-foreground transition-colors">
                            <Mic className="h-5 w-5" />
                        </button>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                            input.trim()
                                ? "bg-accent text-accent-foreground hover:opacity-90 hover:scale-105"
                                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        )}
                    >
                        <ArrowUp className="h-5 w-5" />
                    </button>
                </div>
            </div>
            <div className="mt-2 text-center text-xs text-muted-foreground">
                HetGPT can make mistakes. Check important info.
            </div>
        </div>
    );
}
