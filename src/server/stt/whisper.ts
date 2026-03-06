import OpenAI, { toFile } from "openai";
import type { SttProvider, SttResult } from "./stt.js";

const MIME_TO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

export class WhisperProvider implements SttProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audio: Buffer, mimeType: string): Promise<SttResult> {
    const baseMime = mimeType.split(";")[0].trim();
    const ext = MIME_TO_EXT[baseMime] || "webm";
    const file = await toFile(audio, `recording.${ext}`, { type: mimeType });

    const response = await this.client.audio.transcriptions.create({
      model: "whisper-1",
      file,
    });

    return { text: response.text };
  }
}

export function createWhisperProvider(): WhisperProvider | undefined {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;
  return new WhisperProvider(apiKey);
}
