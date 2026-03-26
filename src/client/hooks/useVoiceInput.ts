import { useCallback, useEffect, useRef, useState } from "react";
import { useStorage } from "@/lib/storage/context.js";

export interface UseVoiceInputReturn {
  recording: boolean;
  transcribing: boolean;
  error: string | null;
  toggle: () => void;
}

export function useVoiceInput(onTranscript: (text: string) => void): UseVoiceInputReturn {
  const storage = useStorage();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  // Stop recording and release mic if the component unmounts
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size === 0) return;

        try {
          setTranscribing(true);
          const { text } = await storage.transcribeAudio(blob);
          if (text.trim()) onTranscript(text.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, [onTranscript, storage]);

  const toggle = useCallback(() => {
    if (recording) {
      stop();
    } else {
      start();
    }
  }, [recording, start, stop]);

  return { recording, transcribing, error, toggle };
}
