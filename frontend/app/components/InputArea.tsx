"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp, Mic } from "lucide-react";
import clsx from "clsx";

interface InputAreaProps {
    onSend: (message: string, file?: File) => void;
    isLoading?: boolean;
}

export function InputArea({ onSend, isLoading = false }: InputAreaProps) {
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
        if (e.key === "Enter" && !e.shiftKey && !isLoading) {
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
        if (isLoading || (!input.trim() && !selectedFile)) return;
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

            {/* Selected File Display (Compact Card) */}
            {selectedFile && (
                <div className="mx-4 mt-4 flex w-fit items-center gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-3 pr-4 backdrop-blur-md transition-all hover:bg-slate-800/80 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400 ring-1 ring-red-500/30 group-hover:bg-red-500/30 transition-colors">
                        <span className="text-[10px] font-bold">PDF</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="max-w-[200px] truncate text-sm font-medium text-slate-200">
                            {selectedFile.name}
                        </span>
                        <span className="text-xs text-slate-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                    </div>
                    <button
                        onClick={handleRemoveFile}
                        className="cursor-pointer ml-2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
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
                className="max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-12 py-4 text-base text-slate-100 focus:outline-none scrollbar-hide placeholder:text-slate-500"
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
                    "absolute left-2 bottom-2.5 rounded-full p-2 transition-colors",
                    isLoading
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-violet-300 hover:bg-slate-800/80 hover:text-violet-200"
                )}
            >
                <Paperclip className="h-5 w-5" />
            </button>

            {/* Send Button (Right) */}
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {!input.trim() && !selectedFile && !isLoading && (
                    <button className="rounded-full p-2 text-violet-300 hover:bg-slate-800/80 hover:text-violet-200 transition-colors">
                        <Mic className="h-5 w-5" />
                    </button>
                )}
                <button
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !selectedFile)}
                    className={clsx(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 border",
                        isLoading
                            ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-70"
                            : (input.trim() || selectedFile)
                                ? "bg-violet-500 text-white hover:bg-violet-400 hover:scale-105 border-violet-500"
                                : "bg-slate-900 text-slate-600 border-slate-700 cursor-not-allowed opacity-70"
                    )}
                >
                    <ArrowUp className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
