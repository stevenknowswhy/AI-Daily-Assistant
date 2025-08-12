/**
 * Chatterbox Voice Interface Component
 * ===================================
 * 
 * React component for voice interactions using Chatterbox TTS
 * Replaces the existing Jarvis voice interface with Chatterbox functionality
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2, Settings } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { ChatterboxService } from '../services/ChatterboxService';
import { VoiceMessage, VoiceInterfaceState, ChatterboxConfig } from '../types/chatterbox.types';

interface ChatterboxVoiceInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
  onProcessCommand?: (command: string) => Promise<string>;
  config?: Partial<ChatterboxConfig>;
}

export const ChatterboxVoiceInterface: React.FC<ChatterboxVoiceInterfaceProps> = ({
  isActive,
  onToggle,
  onProcessCommand,
  config
}) => {
  // State management
  const [state, setState] = useState<VoiceInterfaceState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    messages: []
  });
  
  const [textInput, setTextInput] = useState('');
  const [isServerAvailable, setIsServerAvailable] = useState<boolean | null>(null);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatterboxServiceRef = useRef<ChatterboxService | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Chatterbox service
  useEffect(() => {
    const chatterboxConfig = {
      ...ChatterboxService.getDefaultConfig(),
      ...config
    };

    chatterboxServiceRef.current = new ChatterboxService({
      config: chatterboxConfig,
      onError: (error) => {
        console.error('Chatterbox error:', error);
        setState(prev => ({ ...prev, isSpeaking: false, isProcessing: false }));
      },
      onSuccess: (response) => {
        console.log('Chatterbox success:', response);
      }
    });

    // Check server availability
    checkServerHealth();
  }, [config]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const instance = new SR() as SpeechRecognition;
        recognitionRef.current = instance;
        instance.continuous = false;
        instance.interimResults = false;
        instance.lang = 'en-US';

        instance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          handleVoiceInput(transcript);
        };

        instance.onerror = (event) => {
          console.error('Speech recognition error:', (event as any).error);
          setState(prev => ({ ...prev, isListening: false }));
        };

        instance.onend = () => {
          setState(prev => ({ ...prev, isListening: false }));
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopCurrentAudio();
    };
  }, []);

  const checkServerHealth = useCallback(async () => {
    if (chatterboxServiceRef.current) {
      const available = await chatterboxServiceRef.current.checkHealth();
      setIsServerAvailable(available);
      if (!available) {
        console.warn('⚠️ Chatterbox server not available. Make sure it\'s running on localhost:3005');
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !state.isListening) {
      setState(prev => ({ ...prev, isListening: true }));
      recognitionRef.current.start();
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, [state.isListening]);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!chatterboxServiceRef.current || !isServerAvailable) {
      console.warn('Chatterbox service not available, skipping TTS');
      return;
    }

    try {
      setState(prev => ({ ...prev, isSpeaking: true }));
      
      const response = await chatterboxServiceRef.current.generateSpeech(text);
      
      if (response.success && response.audioUrl) {
        const audio = new Audio(response.audioUrl);
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
          if (response.audioUrl) {
            chatterboxServiceRef.current?.cleanupAudioUrl(response.audioUrl);
          }
        };
        
        audio.onerror = () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
          console.error('Audio playback failed');
        };
        
        await audio.play();
      } else {
        setState(prev => ({ ...prev, isSpeaking: false }));
        console.error('Failed to generate speech:', response.error);
      }
    } catch (error) {
      setState(prev => ({ ...prev, isSpeaking: false }));
      console.error('Speech generation error:', error);
    }
  }, [isServerAvailable]);

  const handleVoiceInput = useCallback(async (transcript: string) => {
    await processCommand(transcript);
  }, []);

  const handleTextSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      await processCommand(textInput.trim());
      setTextInput('');
    }
  }, [textInput]);

  const processCommand = useCallback(async (command: string) => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    // Add user message
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: command,
      timestamp: new Date()
    };
    
    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, userMessage] 
    }));

    try {
      // Process command (use provided handler or default response)
      const response = onProcessCommand 
        ? await onProcessCommand(command)
        : `I heard you say: "${command}". Chatterbox TTS is working!`;
      
      // Add assistant response
      const assistantMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setState(prev => ({ 
        ...prev, 
        messages: [...prev.messages, assistantMessage],
        isProcessing: false
      }));
      
      // Speak the response using Chatterbox
      await speak(response);
      
    } catch (error) {
      console.error('Command processing error:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [onProcessCommand, speak]);

  if (!isActive) return null;

  return (
    <Card className="border-indigo-200 dark:border-indigo-800 w-80 max-h-96">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Chatterbox Voice Assistant
            {isServerAvailable === false && (
              <span className="text-xs text-red-500" title="Chatterbox server not available">⚠️</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server Status */}
        {isServerAvailable === false && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            Chatterbox server not available. Start server: <code>python server.py --host 127.0.0.1 --port 8000</code>
          </div>
        )}

        {/* Voice Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={state.isListening ? stopListening : startListening}
            disabled={state.isProcessing}
            className={`${state.isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {state.isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Listen
              </>
            )}
          </Button>
          
          <Button
            onClick={stopCurrentAudio}
            disabled={!state.isSpeaking}
            variant="outline"
          >
            {state.isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Speak
              </>
            )}
          </Button>
        </div>

        {/* Text Input */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message..."
            disabled={state.isProcessing}
          />
          <Button type="submit" disabled={state.isProcessing || !textInput.trim()}>
            {state.isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Messages */}
        <div className="max-h-32 overflow-y-auto space-y-2">
          {state.messages.slice(-3).map((message) => (
            <div
              key={message.id}
              className={`text-xs p-2 rounded ${
                message.type === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
              }`}
            >
              <strong>{message.type === 'user' ? 'You' : 'Assistant'}:</strong> {message.content}
            </div>
          ))}
        </div>

        {/* Status Indicators */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {state.isListening && '🎤 Listening...'}
            {state.isSpeaking && '🔊 Speaking...'}
            {state.isProcessing && '⏳ Processing...'}
            {!state.isListening && !state.isSpeaking && !state.isProcessing && '💤 Ready'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkServerHealth}
            className="h-auto p-1"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
