"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp, Mic } from "lucide-react";
import clsx from "clsx";

interface InputAreaProps {
    onSend: (message: string, file?: File) => void;
    isLoading?: boolean;
    remainingPrompts?: number;
    isRateLimited?: boolean;
}

export function InputArea({ onSend, isLoading = false, remainingPrompts = 5, isRateLimited = false }: InputAreaProps) {
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
        if (e.key === "Enter" && !e.shiftKey && !isLoading && !isRateLimited) {
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
        if (isLoading || isRateLimited || (!input.trim() && !selectedFile)) return;
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
        <div className="relative flex w-full flex-col rounded-2xl border border-slate-700/80 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 focus-within:border-violet-500 focus-within:bg-slate-900/90 focus-within:shadow-[0_18px_40px_rgba(0,0,0,0.9)]">

            {/* Rate Limit Warning Banner */}
            {isRateLimited && (
                <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Daily prompt limit reached. Try again tomorrow!</span>
                </div>
            )}

            {/* Selected File Display (Compact Card) */}
            {selectedFile && (
                <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 flex w-fit items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-white/10 bg-slate-800/60 p-2 sm:p-3 pr-3 sm:pr-4 backdrop-blur-md transition-all hover:bg-slate-800/80 group">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-md sm:rounded-lg bg-red-500/20 text-red-400 ring-1 ring-red-500/30 group-hover:bg-red-500/30 transition-colors">
                        <span className="text-[9px] sm:text-[10px] font-bold">PDF</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm font-medium text-slate-200">
                            {selectedFile.name}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                    </div>
                    <button
                        onClick={handleRemoveFile}
                        className="cursor-pointer ml-1 sm:ml-2 rounded-full p-1 sm:p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
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
                placeholder="Chat with HetGPT..."
                className="max-h-[200px] min-h-[48px] sm:min-h-[52px] w-full resize-none bg-transparent px-10 sm:px-12 py-3 sm:py-4 text-sm sm:text-base text-slate-100 focus:outline-none scrollbar-hide placeholder:text-slate-500"
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
                disabled={isLoading}
                className={clsx(
                    "absolute left-2 bottom-2 sm:bottom-2.5 rounded-full p-2 sm:p-2.5 transition-colors min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center",
                    isLoading
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-violet-300 hover:bg-slate-800/80 hover:text-violet-200"
                )}
            >
                <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Send Button (Right) */}
            <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 flex items-center gap-1 sm:gap-2">
                {!input.trim() && !selectedFile && !isLoading && (
                    <button
                        title="Coming soon"
                        className="rounded-full p-2 text-violet-300 hover:bg-slate-800/80 hover:text-violet-200 transition-colors hidden sm:flex cursor-not-allowed"
                    >
                        <Mic className="h-5 w-5" />
                    </button>
                )}
                <button
                    onClick={handleSend}
                    disabled={isLoading || isRateLimited || (!input.trim() && !selectedFile)}
                    title={isRateLimited ? "Daily limit reached" : undefined}
                    className={clsx(
                        "flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 border",
                        isLoading || isRateLimited
                            ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-70"
                            : (input.trim() || selectedFile)
                                ? "bg-violet-500 text-white hover:bg-violet-400 hover:scale-105 border-violet-500"
                                : "bg-slate-900 text-slate-600 border-slate-700 cursor-not-allowed opacity-70"
                    )}
                >
                    <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
            </div>
        </div>
    );
}
