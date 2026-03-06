export interface SttResult {
  text: string;
}

export interface SttProvider {
  transcribe(audio: Buffer, mimeType: string): Promise<SttResult>;
}
