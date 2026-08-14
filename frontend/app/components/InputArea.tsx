"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, Mic, Square, Loader2, Cpu } from "lucide-react";
import clsx from "clsx";
import { useMoonshineSTT, STTModelOption } from "../hooks/useMoonshineSTT";

interface InputAreaProps {
    onSend: (message: string, file?: File) => void;
    isLoading?: boolean;
    remainingPrompts?: number;
    isRateLimited?: boolean;
}

export function InputArea({ onSend, isLoading = false, isRateLimited = false }: InputAreaProps) {
    const [input, setInput] = useState("");
    const [preSpeechInput, setPreSpeechInput] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live speech updates text area in real-time as spoken
    const handleLiveSpeech = useCallback((liveText: string) => {
        setInput((prev) => {
            const base = preSpeechInput.trim();
            return base ? `${base} ${liveText}` : liveText;
        });
    }, [preSpeechInput]);

    // High accuracy server-side Moonshine STT refinement
    const handleTranscriptionComplete = useCallback((finalText: string) => {
        setInput((prev) => {
            const base = preSpeechInput.trim();
            return base ? `${base} ${finalText}` : finalText;
        });
    }, [preSpeechInput]);

    const {
        isRecording,
        isTranscribing,
        selectedModel,
        setSelectedModel,
        toggleRecording,
    } = useMoonshineSTT({
        onTranscriptionComplete: handleTranscriptionComplete,
        onLiveSpeech: handleLiveSpeech,
        defaultModel: "web-speech",
    });

    const handleToggleRecording = () => {
        if (!isRecording) {
            setPreSpeechInput(input);
        }
        toggleRecording();
    };

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
                e.target.value = "";
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
        setPreSpeechInput("");
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const getModelLabel = (model: STTModelOption) => {
        switch (model) {
            case "moonshine-base":
                return "Server Moonshine Base (245M)";
            case "moonshine-tiny":
                return "Server Moonshine Tiny";
            case "web-speech":
                return "Browser Web Speech API";
        }
    };

    return (
        <div className="relative flex w-full flex-col rounded-2xl border border-slate-700/80 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 focus-within:border-violet-500 focus-within:bg-slate-900/90 focus-within:shadow-[0_18px_40px_rgba(0,0,0,0.9)]">

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
                placeholder={isRecording ? "Listening... speak now" : "Chat with HetGPT..."}
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
                title="Attach PDF"
                className={clsx(
                    "absolute left-2 bottom-2 sm:bottom-2.5 rounded-full p-2 sm:p-2.5 transition-colors min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center cursor-pointer",
                    isLoading
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-violet-300 hover:bg-slate-800/80 hover:text-violet-200"
                )}
            >
                <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Controls (Right) */}
            <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 flex items-center gap-1.5 sm:gap-2">

                {/* STT Model Dropdown Selector Popover */}
                {showModelMenu && (
                    <div className="absolute bottom-12 right-0 z-50 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
                        <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                            <span>Select STT Engine</span>
                            <Cpu className="h-3 w-3 text-violet-400" />
                        </div>
                        <div className="mt-1 space-y-1">
                            {(["web-speech", "moonshine-base", "moonshine-tiny"] as STTModelOption[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => {
                                        setSelectedModel(m);
                                        setShowModelMenu(false);
                                    }}
                                    className={clsx(
                                        "w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col cursor-pointer",
                                        selectedModel === m
                                            ? "bg-violet-600/30 text-violet-200 font-medium border border-violet-500/40"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                                    )}
                                >
                                    <span>{getModelLabel(m)}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {m === "moonshine-base"
                                            ? "UsefulSensors Moonshine 245M model (Server Cached)"
                                            : m === "moonshine-tiny"
                                                ? "Moonshine Tiny model (Server Cached)"
                                                : "Browser native API (instant response)"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sleek Inline "Listening..." Badge next to Mic */}
                {isRecording && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium animate-pulse">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span>listening...</span>
                    </div>
                )}

                {/* Mic Speech-to-Text Button */}
                <div className="relative flex items-center">
                    <button
                        onClick={handleToggleRecording}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setShowModelMenu((prev) => !prev);
                        }}
                        disabled={isTranscribing}
                        title={
                            isRecording
                                ? "Click to stop recording"
                                : `Speech to Text using ${getModelLabel(selectedModel)} (Right-click to change STT model)`
                        }
                        className={clsx(
                            "relative flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-300 border cursor-pointer",
                            isRecording
                                ? "bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse ring-2 ring-red-500/40"
                                : isTranscribing
                                    ? "bg-slate-800 text-violet-400 border-violet-500/50 cursor-wait"
                                    : "bg-slate-800/80 text-violet-300 border-slate-700/80 hover:bg-slate-700/80 hover:text-violet-200 hover:border-violet-500/50"
                        )}
                    >
                        {isTranscribing ? (
                            <Loader2 className="h-4 w-4 sm:h-4 sm:w-4 animate-spin text-violet-400" />
                        ) : isRecording ? (
                            <Square className="h-3.5 w-3.5 fill-current text-white" />
                        ) : (
                            <Mic className="h-4 w-4 sm:h-4 sm:w-4" />
                        )}
                    </button>
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={isLoading || isRateLimited || (!input.trim() && !selectedFile)}
                    title={isRateLimited ? "Daily limit reached" : undefined}
                    className={clsx(
                        "flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-200 border cursor-pointer",
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


