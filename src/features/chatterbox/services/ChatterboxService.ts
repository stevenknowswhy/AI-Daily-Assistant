/**
 * Chatterbox TTS Service
 * =====================
 * 
 * Service for interacting with local Chatterbox TTS server
 * Provides text-to-speech functionality with voice cloning support
 */

import { ChatterboxConfig, ChatterboxRequest, ChatterboxResponse, ChatterboxServiceOptions } from '../types/chatterbox.types';

export class ChatterboxService {
  private config: ChatterboxConfig;
  private onError?: (error: Error) => void;
  private onSuccess?: (response: ChatterboxResponse) => void;

  constructor(options: ChatterboxServiceOptions) {
    this.config = options.config;
    this.onError = options.onError;
    this.onSuccess = options.onSuccess;
  }

  /**
   * Default configuration for local development
   */
  static getDefaultConfig(): ChatterboxConfig {
    return {
      baseUrl: 'http://localhost:3005',
      model: 'chatterbox',
      voice: 'default',
      exaggeration: 0.5,
      seed: 42,
      timeout: 30000 // 30 seconds
    };
  }

  /**
   * Check if Chatterbox server is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      return response.ok;
    } catch (error) {
      console.warn('Chatterbox server health check failed:', error);
      return false;
    }
  }

  /**
   * Generate speech from text using Chatterbox TTS
   */
  async generateSpeech(text: string, options?: Partial<ChatterboxRequest>): Promise<ChatterboxResponse> {
    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text input is required');
      }

      // Prepare request payload
      const request: ChatterboxRequest = {
        model: options?.model || this.config.model,
        input: text.trim(),
        voice: options?.voice || this.config.voice,
        exaggeration: options?.exaggeration ?? this.config.exaggeration,
        seed: options?.seed ?? this.config.seed
      };

      console.log('🎤 Generating speech with Chatterbox:', {
        textLength: text.length,
        voice: request.voice,
        exaggeration: request.exaggeration
      });

      // Make API request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

      const response = await fetch(`${this.config.baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Chatterbox API error: ${response.status} ${response.statusText}`);
      }

      // Get audio data
      const audioData = await response.arrayBuffer();
      
      // Create blob URL for audio playback
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const result: ChatterboxResponse = {
        success: true,
        audioUrl,
        audioData,
        duration: audioData.byteLength // Approximate duration indicator
      };

      console.log('✅ Speech generated successfully:', {
        audioSize: audioData.byteLength,
        audioUrl: audioUrl.substring(0, 50) + '...'
      });

      if (this.onSuccess) {
        this.onSuccess(result);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Chatterbox speech generation failed:', errorMessage);

      const result: ChatterboxResponse = {
        success: false,
        error: errorMessage
      };

      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(errorMessage));
      }

      return result;
    }
  }

  /**
   * Play audio from URL
   */
  async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Audio playback failed'));
      
      audio.play().catch(reject);
    });
  }

  /**
   * Clean up blob URLs to prevent memory leaks
   */
  cleanupAudioUrl(audioUrl: string): void {
    if (audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ChatterboxConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ChatterboxConfig {
    return { ...this.config };
  }
}
