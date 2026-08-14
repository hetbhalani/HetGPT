"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { startAudioRecording, RecordingSession } from "../utils/audioUtils";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type STTModelOption = "moonshine-base" | "moonshine-tiny" | "web-speech";

export interface UseMoonshineSTTProps {
    onTranscriptionComplete: (text: string, isFinal?: boolean) => void;
    onLiveSpeech?: (text: string) => void;
    defaultModel?: STTModelOption;
}

export function useMoonshineSTT({
    onTranscriptionComplete,
    onLiveSpeech,
    defaultModel = "web-speech",
}: UseMoonshineSTTProps) {
    const [selectedModel, setSelectedModel] = useState<STTModelOption>(defaultModel);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);

    const recordingSessionRef = useRef<RecordingSession | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webSpeechRef = useRef<any>(null);

    // Continuous accumulation across pauses
    const accumulatedTextRef = useRef<string>("");
    const currentChunkTextRef = useRef<string>("");
    const isRecordingRef = useRef<boolean>(false);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isRecordingRef.current = false;
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (recordingSessionRef.current) recordingSessionRef.current.cancel();
            if (webSpeechRef.current) {
                try { webSpeechRef.current.abort(); } catch { }
            }
        };
    }, []);

    /**
     * Start live speech dictation (accumulates continuously across speech pauses)
     */
    const startLiveDictation = useCallback(() => {
        const SpeechRecognition =
            (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition;

        if (!SpeechRecognition) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const recognition = new (SpeechRecognition as any)();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            accumulatedTextRef.current = "";
            currentChunkTextRef.current = "";

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                let currentSessionText = "";
                for (let i = 0; i < event.results.length; ++i) {
                    currentSessionText += event.results[i][0].transcript;
                }
                currentChunkTextRef.current = currentSessionText;

                const combined = (accumulatedTextRef.current + " " + currentSessionText).trim();
                if (combined && onLiveSpeech) {
                    onLiveSpeech(combined);
                }
            };

            recognition.onend = () => {
                // If recognition stops due to speech pause, append chunk & restart if still recording
                if (currentChunkTextRef.current.trim()) {
                    accumulatedTextRef.current = (accumulatedTextRef.current + " " + currentChunkTextRef.current).trim();
                    currentChunkTextRef.current = "";
                }

                if (isRecordingRef.current) {
                    try {
                        recognition.start();
                    } catch {
                        // ignore restart errors
                    }
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (e: any) => {
                if (e.error === "no-speech" || e.error === "audio-capture") return;
                console.warn("Live dictation info:", e.error);
            };

            recognition.start();
            webSpeechRef.current = recognition;
        } catch (err) {
            console.warn("Could not initialize live speech dictation:", err);
        }
    }, [onLiveSpeech]);

    /**
     * Start microphone recording
     */
    const startRecording = useCallback(async () => {
        accumulatedTextRef.current = "";
        currentChunkTextRef.current = "";

        if (selectedModel !== "web-speech") {
            try {
                const session = await startAudioRecording((volume) => {
                    setVolumeLevel(volume);
                });
                recordingSessionRef.current = session;
            } catch (err: unknown) {
                console.error("Microphone start error:", err);
            }
        }

        setIsRecording(true);
        isRecordingRef.current = true;
        setRecordingTime(0);

        timerIntervalRef.current = setInterval(() => {
            setRecordingTime((t) => t + 1);
        }, 1000);

        startLiveDictation();
    }, [selectedModel, startLiveDictation]);

    /**
     * Stop recording
     */
    const stopRecording = useCallback(async () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        setVolumeLevel(0);
        setRecordingTime(0);

        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        if (webSpeechRef.current) {
            try {
                webSpeechRef.current.stop();
            } catch { }
            webSpeechRef.current = null;
        }

        // Finalize current speech accumulation
        const finalLiveText = (accumulatedTextRef.current + " " + currentChunkTextRef.current).trim();

        const session = recordingSessionRef.current;
        recordingSessionRef.current = null;

        if (selectedModel === "web-speech" || !session) {
            if (session) {
                try {
                    await session.cancel();
                } catch { }
            }
            if (finalLiveText) {
                onTranscriptionComplete(finalLiveText, true);
            }
            return;
        }

        // Optional refinement via server Moonshine STT (quiet & graceful)
        try {
            setIsTranscribing(true);
            const { blob } = await session.stop();

            if (blob && blob.size > 1000) {
                const formData = new FormData();
                const fileName = `audio_${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
                formData.append("file", blob, fileName);

                const moonshineModel = selectedModel === "moonshine-tiny" ? "moonshine/tiny" : "moonshine/base";
                formData.append("model", moonshineModel);

                const res = await fetch(`${BACKEND_URL}/stt`, {
                    method: "POST",
                    body: formData,
                });

                if (res.ok) {
                    const data = await res.json();
                    const serverText = (data.text || "").trim();
                    if (serverText) {
                        onTranscriptionComplete(serverText, true);
                    } else if (finalLiveText) {
                        onTranscriptionComplete(finalLiveText, true);
                    }
                } else if (finalLiveText) {
                    onTranscriptionComplete(finalLiveText, true);
                }
            } else if (finalLiveText) {
                onTranscriptionComplete(finalLiveText, true);
            }
        } catch {
            if (finalLiveText) {
                onTranscriptionComplete(finalLiveText, true);
            }
        } finally {
            setIsTranscribing(false);
        }
    }, [selectedModel, onTranscriptionComplete]);

    const toggleRecording = useCallback(() => {
        if (isRecordingRef.current) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [startRecording, stopRecording]);

    return {
        isRecording,
        isTranscribing,
        volumeLevel,
        recordingTime,
        selectedModel,
        setSelectedModel,
        startRecording,
        stopRecording,
        toggleRecording,
    };
}
