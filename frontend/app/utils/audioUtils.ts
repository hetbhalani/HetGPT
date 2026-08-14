/**
 * Audio recorder and resampling utility for client-side Moonshine STT.
 * Converts microphone audio stream into 16kHz mono Float32Array required by @huggingface/transformers.
 */

export interface RecordingResult {
    blob: Blob;
    mimeType: string;
}

export interface RecordingSession {
    stop: () => Promise<RecordingResult>;
    cancel: () => void;
}

/**
 * Resamples an AudioBuffer to 16,000 Hz Mono Float32Array
 */
export async function audioBufferTo16kHzMono(audioBuffer: AudioBuffer): Promise<Float32Array> {
    const targetSampleRate = 16000;
    const numChannels = 1;

    // Use OfflineAudioContext to perform fast hardware-accelerated resampling
    const offlineContext = new OfflineAudioContext(
        numChannels,
        Math.ceil(audioBuffer.duration * targetSampleRate),
        targetSampleRate
    );

    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    return renderedBuffer.getChannelData(0);
}

/**
 * Starts microphone recording with live volume visualization callback.
 */
export async function startAudioRecording(
    onVolumeChange?: (volume: number) => void
): Promise<RecordingSession> {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
    });

    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Set up volume analyzer for visualizer feedback
    let animationFrameId: number | null = null;
    let analyser: AnalyserNode | null = null;

    if (onVolumeChange) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        mediaStreamSource.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volume = Math.min(1, average / 128); // 0.0 to 1.0 normalized
            onVolumeChange(volume);
            animationFrameId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
    }

    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/webm";

    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    mediaRecorder.start(100);

    const cleanup = () => {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }
        stream.getTracks().forEach((track) => track.stop());
        if (audioContext.state !== "closed") {
            audioContext.close();
        }
    };

    const stop = (): Promise<RecordingResult> => {
        return new Promise((resolve, reject) => {
            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(chunks, { type: mimeType });
                    cleanup();
                    resolve({ blob: audioBlob, mimeType });
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            };

            if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            } else {
                cleanup();
                reject(new Error("Recording was inactive"));
            }
        });
    };

    const cancel = () => {
        if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        cleanup();
    };

    return { stop, cancel };
}
