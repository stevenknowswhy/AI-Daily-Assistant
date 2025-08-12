import React from 'react';
import { Mic, User, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { ChatterboxWidgetProps } from '../../../types/dashboard';
import { useAgentSettings } from '../../../contexts/AgentSettingsContext';

export const ChatterboxWidget: React.FC<ChatterboxWidgetProps> = ({
  isVoiceActive,
  onChatterboxClick
}) => {
  const { settings, getPersonalityLabel, getVoiceLabel } = useAgentSettings();

  return (
    <Card
      className={`glass-card-indigo cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10 ${
        isVoiceActive ? 'ring-2 ring-indigo-500' : ''
      }`}
      onClick={onChatterboxClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-foreground">AI Assistant</CardTitle>
        <Mic className={`h-4 w-4 text-gray-600 dark:text-gray-300 ${isVoiceActive ? 'animate-pulse' : ''}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
          {isVoiceActive ? 'Listening...' : 'Ready'}
        </div>
        <p className="text-xs text-gray-600 dark:text-muted-foreground mb-3">
          {isVoiceActive ? 'Speak your command' : 'Speak to your AI assistant'}
        </p>

        {/* Agent Settings Display */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
            <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {getPersonalityLabel(settings.selectedPersonality)}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Volume2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
            <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {getVoiceLabel(settings.selectedVoice)}
            </Badge>
          </div>
        </div>

        <div className="mt-2">
          <div className="w-full bg-indigo-100 dark:bg-indigo-900 rounded-full h-1">
            <div
              className={`bg-indigo-600 h-1 rounded-full transition-all duration-300 ${
                isVoiceActive ? 'w-full animate-pulse' : 'w-1/3'
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
