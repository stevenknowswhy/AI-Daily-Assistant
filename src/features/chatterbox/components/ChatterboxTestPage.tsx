/**
 * Chatterbox Test Page
 * ===================
 * 
 * Standalone test page for verifying Chatterbox TTS functionality
 * This component allows manual testing of the Chatterbox integration
 */

import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChatterboxService } from '../services/ChatterboxService';
import { ChatterboxConfig, ChatterboxResponse } from '../types/chatterbox.types';
import { ChatterboxVoiceInterface } from './ChatterboxVoiceInterface';

export const ChatterboxTestPage: React.FC = () => {
  const [service, setService] = useState<ChatterboxService | null>(null);
  const [config, setConfig] = useState<ChatterboxConfig>(ChatterboxService.getDefaultConfig());
  const [testText, setTestText] = useState('Hello! This is a test of Chatterbox TTS. How does it sound?');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<ChatterboxResponse | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);

  // Initialize service
  useEffect(() => {
    const newService = new ChatterboxService({
      config,
      onError: (error) => {
        console.error('Chatterbox error:', error);
        setIsGenerating(false);
      },
      onSuccess: (response) => {
        console.log('Chatterbox success:', response);
        setLastResponse(response);
        setIsGenerating(false);
      }
    });
    
    setService(newService);
    checkServerStatus(newService);
  }, [config]);

  const checkServerStatus = async (serviceInstance?: ChatterboxService) => {
    setServerStatus('checking');
    const currentService = serviceInstance || service;
    if (currentService) {
      const available = await currentService.checkHealth();
      setServerStatus(available ? 'available' : 'unavailable');
    }
  };

  const handleConfigChange = (field: keyof ChatterboxConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: field === 'exaggeration' || field === 'seed' || field === 'timeout' 
        ? Number(value) 
        : value
    }));
  };

  const generateSpeech = async () => {
    if (!service || !testText.trim()) return;

    setIsGenerating(true);
    setLastResponse(null);

    try {
      const response = await service.generateSpeech(testText);
      setLastResponse(response);
      
      if (response.success && response.audioUrl) {
        // Auto-play the generated audio
        const audio = new Audio(response.audioUrl);
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error('Speech generation failed:', error);
      setLastResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const playLastAudio = () => {
    if (lastResponse?.audioUrl) {
      const audio = new Audio(lastResponse.audioUrl);
      audio.play().catch(console.error);
    }
  };

  const mockProcessCommand = async (command: string): Promise<string> => {
    // Simple mock responses for testing
    const responses = [
      `I heard you say: "${command}". This is a test response from Chatterbox TTS.`,
      `Processing your command: "${command}". The voice synthesis is working correctly.`,
      `Command received: "${command}". Chatterbox is successfully generating speech.`
    ];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getStatusIcon = () => {
    switch (serverStatus) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'checking':
        return 'Checking server...';
      case 'available':
        return 'Server available';
      case 'unavailable':
        return 'Server unavailable';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Chatterbox TTS Test Page</h1>
          <p className="text-muted-foreground">
            Test the Chatterbox TTS integration independently
          </p>
        </div>

        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Server Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{getStatusText()}</p>
                <p className="text-sm text-muted-foreground">
                  {config.baseUrl}/v1/audio/speech
                </p>
                {serverStatus === 'unavailable' && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          Chatterbox server not running
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                          Start the server with: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
                            python server.py --host 127.0.0.1 --port 8000 --device mps
                          </code>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={() => checkServerStatus()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={config.baseUrl}
                  onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="voice">Voice</Label>
                <Input
                  id="voice"
                  value={config.voice}
                  onChange={(e) => handleConfigChange('voice', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="exaggeration">Exaggeration (0-1)</Label>
                <Input
                  id="exaggeration"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.exaggeration}
                  onChange={(e) => handleConfigChange('exaggeration', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="seed">Seed</Label>
                <Input
                  id="seed"
                  type="number"
                  value={config.seed}
                  onChange={(e) => handleConfigChange('seed', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Text-to-Speech Test */}
        <Card>
          <CardHeader>
            <CardTitle>Text-to-Speech Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testText">Test Text</Label>
              <Textarea
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={generateSpeech} 
                disabled={isGenerating || !testText.trim() || serverStatus !== 'available'}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Speech
                  </>
                )}
              </Button>
              
              {lastResponse?.success && lastResponse.audioUrl && (
                <Button onClick={playLastAudio} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Play Last Audio
                </Button>
              )}
            </div>

            {/* Response Display */}
            {lastResponse && (
              <div className={`p-3 rounded-md ${
                lastResponse.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <p className={`font-medium ${
                  lastResponse.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {lastResponse.success ? '✅ Success' : '❌ Error'}
                </p>
                {lastResponse.error && (
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    {lastResponse.error}
                  </p>
                )}
                {lastResponse.success && lastResponse.duration && (
                  <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                    Audio size: {lastResponse.duration} bytes
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Interface Test */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Interface Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Test the complete voice interface with speech recognition and TTS response.
              </p>
              
              <Button 
                onClick={() => setShowVoiceInterface(!showVoiceInterface)}
                disabled={serverStatus !== 'available'}
              >
                {showVoiceInterface ? 'Hide' : 'Show'} Voice Interface
              </Button>
              
              {showVoiceInterface && (
                <div className="flex justify-center pt-4">
                  <ChatterboxVoiceInterface
                    isActive={true}
                    onToggle={() => setShowVoiceInterface(false)}
                    onProcessCommand={mockProcessCommand}
                    config={config}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
