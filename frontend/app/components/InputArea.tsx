"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp, Mic } from "lucide-react";
import { clsx } from "clsx";

interface InputAreaProps {
    onSend: (message: string, file?: File) => void;
}

export function InputArea({ onSend }: InputAreaProps) {
    const [input, setInput] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                setSelectedFile(file);
            } else {
                alert("Only PDF files are allowed.");
                e.target.value = ""; // Reset input
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSend = () => {
        if (!input.trim() && !selectedFile) return;
        onSend(input, selectedFile || undefined);
        setInput("");
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    return (
        <div className="mx-auto w-full">
            <div className="relative flex w-full flex-col rounded-3xl border border-border bg-muted/50 backdrop-blur-xl transition-all duration-300 focus-within:border-purple-500/30 focus-within:bg-muted/70 focus-within:shadow-md focus-within:shadow-purple-500/10">

                {/* Selected File Display (Compact Card) */}
                {selectedFile && (
                    <div className="mx-4 mt-4 flex w-fit items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3 pr-4 backdrop-blur-md transition-all hover:bg-background/60">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
                            <span className="text-[10px] font-bold">PDF</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="max-w-[200px] truncate text-sm font-medium text-foreground/90">
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                        </div>
                        <button
                            onClick={handleRemoveFile}
                            className="ml-2 rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                            <span className="sr-only">Remove file</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                )}

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

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf"
                    className="hidden"
                />

                {/* Attachment Button (Left) */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute left-3 bottom-3 rounded-full p-2 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                >
                    <Paperclip className="h-5 w-5" />
                </button>

                {/* Send Button (Right) */}
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    {!input.trim() && !selectedFile && (
                        <button className="rounded-full p-2 text-muted-foreground hover:bg-background hover:text-foreground transition-colors">
                            <Mic className="h-5 w-5" />
                        </button>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() && !selectedFile}
                        className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                            (input.trim() || selectedFile)
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
