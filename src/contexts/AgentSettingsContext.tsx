import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AgentSettings {
  selectedPersonality: string;
  selectedVoice: string;
  customInstructions: string;
}

interface AgentSettingsContextType {
  settings: AgentSettings;
  updateSettings: (newSettings: Partial<AgentSettings>) => void;
  getPersonalityLabel: (id: string) => string;
  getVoiceLabel: (id: string) => string;
}

const AgentSettingsContext = createContext<AgentSettingsContextType | undefined>(undefined);

const personalities = [
  { id: 'professional', name: 'Professional' },
  { id: 'casual', name: 'Casual' },
  { id: 'outgoing', name: 'Outgoing' },
  { id: 'reserved', name: 'Reserved' },
  { id: 'creative', name: 'Creative' },
  { id: 'admirer', name: 'Admirer' },
];

const voiceOptions = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

interface AgentSettingsProviderProps {
  children: ReactNode;
}

export const AgentSettingsProvider: React.FC<AgentSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AgentSettings>({
    selectedPersonality: 'professional',
    selectedVoice: 'alloy',
    customInstructions: '',
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('agentSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved agent settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('agentSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AgentSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const getPersonalityLabel = (id: string): string => {
    const personality = personalities.find(p => p.id === id);
    return personality?.name || 'Professional';
  };

  const getVoiceLabel = (id: string): string => {
    const voice = voiceOptions.find(v => v.value === id);
    return voice?.label || 'Alloy';
  };

  const value: AgentSettingsContextType = {
    settings,
    updateSettings,
    getPersonalityLabel,
    getVoiceLabel,
  };

  return (
    <AgentSettingsContext.Provider value={value}>
      {children}
    </AgentSettingsContext.Provider>
  );
};

export const useAgentSettings = (): AgentSettingsContextType => {
  const context = useContext(AgentSettingsContext);
  if (context === undefined) {
    throw new Error('useAgentSettings must be used within an AgentSettingsProvider');
  }
  return context;
};
