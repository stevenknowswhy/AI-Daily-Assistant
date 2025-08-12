import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDashboard } from '@/hooks/useDashboard';

interface JarvisVoiceInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
}

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const JarvisVoiceInterface: React.FC<JarvisVoiceInterfaceProps> = ({
  isActive,
  onToggle
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { processVoiceCommand } = useDashboard();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech recognition
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
          setIsListening(false);
        };

        instance.onend = () => {
          setIsListening(false);
        };
      }
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = synthRef.current.getVoices().find(voice => 
        voice.name.includes('Alex') || voice.name.includes('Daniel')
      ) || synthRef.current.getVoices()[0];
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    await processCommand(transcript);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      await processCommand(textInput.trim());
      setTextInput('');
    }
  };

  const processCommand = async (command: string) => {
    setIsProcessing(true);
    
    // Add user message
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: command,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await processVoiceCommand(command);
      
      // Add assistant response
      const assistantMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      speak(response);
      
    } catch (error) {
      const errorMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isActive) {
    return (
      <Card className="border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            JARVIS Voice Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Click the JARVIS widget above to activate voice assistant
            </p>
            <Button onClick={onToggle} className="bg-indigo-600 hover:bg-indigo-700">
              <Mic className="h-4 w-4 mr-2" />
              Activate JARVIS
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            JARVIS Voice Assistant
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Listening
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => synthRef.current?.cancel()}
            disabled={!isSpeaking}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Stop Speaking
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Not Speaking
              </>
            )}
          </Button>
        </div>

        {/* Quick Command Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => processCommand("Give me my daily summary")}
            disabled={isProcessing}
            className="text-xs text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            📊 Daily Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => processCommand("What's on my calendar today?")}
            disabled={isProcessing}
            className="text-xs text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            📅 Today's Schedule
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => processCommand("Do I have any important emails?")}
            disabled={isProcessing}
            className="text-xs text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            📧 Important Emails
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => processCommand("Do I have any bills due soon?")}
            disabled={isProcessing}
            className="text-xs text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            💰 Bills Due
          </Button>
        </div>

        {/* Text Input Alternative */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a command to JARVIS..."
            disabled={isProcessing}
          />
          <Button type="submit" disabled={!textInput.trim() || isProcessing}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Conversation History */}
        <div className="max-h-64 overflow-y-auto space-y-3 border-t pt-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm">
              Say "Hello JARVIS" or type a command to get started
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-indigo-100 dark:bg-indigo-900/20 ml-4'
                    : 'bg-gray-100 dark:bg-gray-800 mr-4'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.type === 'user' ? 'You' : 'JARVIS'}:
                  </span>
                  <span className="text-sm flex-1">{message.content}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span className={`flex items-center gap-1 ${isListening ? 'text-red-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isListening ? 'Listening...' : 'Ready'}
          </span>
          <span className={`flex items-center gap-1 ${isSpeaking ? 'text-blue-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isSpeaking ? 'Speaking...' : 'Silent'}
          </span>
          <span className={`flex items-center gap-1 ${isProcessing ? 'text-yellow-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isProcessing ? 'Processing...' : 'Idle'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default JarvisVoiceInterface;
