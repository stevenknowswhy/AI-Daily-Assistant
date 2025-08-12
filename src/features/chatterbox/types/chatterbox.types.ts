/**
 * Chatterbox TTS Types
 * ===================
 * 
 * Type definitions for Chatterbox TTS integration
 */

export interface ChatterboxConfig {
  baseUrl: string;
  model: string;
  voice: string;
  exaggeration: number;
  seed: number;
  timeout?: number;
}

export interface ChatterboxRequest {
  model: string;
  input: string;
  voice: string;
  exaggeration: number;
  seed: number;
}

export interface ChatterboxResponse {
  success: boolean;
  audioUrl?: string;
  audioData?: ArrayBuffer;
  error?: string;
  duration?: number;
}

export interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface ChatterboxServiceOptions {
  config: ChatterboxConfig;
  onError?: (error: Error) => void;
  onSuccess?: (response: ChatterboxResponse) => void;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceInterfaceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  messages: VoiceMessage[];
  currentAudio?: HTMLAudioElement;
}
