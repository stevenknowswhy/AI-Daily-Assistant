/**
 * Chatterbox TTS Feature Module
 * ============================
 * 
 * Standalone Chatterbox TTS integration for web-based voice interactions.
 * This module provides text-to-speech functionality using a local Chatterbox server.
 */

export { ChatterboxService } from './services/ChatterboxService';
export { ChatterboxVoiceInterface } from './components/ChatterboxVoiceInterface';
export { ChatterboxTestPage } from './components/ChatterboxTestPage';
export type { ChatterboxConfig, ChatterboxResponse, VoiceMessage } from './types/chatterbox.types';
