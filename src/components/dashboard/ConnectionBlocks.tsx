import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Mail,
  DollarSign,
  Phone,
  Settings,
  Trash2,
  Loader2,

} from 'lucide-react';
import { ConnectionStatus } from '@/types/dashboard';
import toast from 'react-hot-toast';

interface ConnectionBlocksProps {
  connectionStatus: ConnectionStatus;
  onAuthenticateCalendar: () => Promise<void>;
  onAuthenticateGmail: () => Promise<void>;
  onAuthenticateBills: () => Promise<boolean>;
  onDisconnectService: (service: 'calendar' | 'email' | 'bills' | 'phone') => Promise<void>;
}

interface ConnectionBlock {
  id: 'calendar' | 'email' | 'bills' | 'phone';
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string; // Kept for compatibility but not used
  hoverColor: string; // Kept for compatibility but not used
  connected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const ConnectionBlocks: React.FC<ConnectionBlocksProps> = ({
  connectionStatus,
  onAuthenticateCalendar,
  onAuthenticateGmail,
  onAuthenticateBills,
  onDisconnectService
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  const setLoading = (service: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [service]: loading }));
  };



  const handleDisconnect = async (service: 'calendar' | 'email' | 'bills' | 'phone') => {
    try {
      setLoading(service, true);
      await onDisconnectService(service);
      toast.success(`${service.charAt(0).toUpperCase() + service.slice(1)} disconnected successfully!`);
      setShowEditModal(null);
    } catch (error) {
      console.error(`Failed to disconnect ${service}:`, error);
      toast.error(`Failed to disconnect ${service}. Please try again.`);
    } finally {
      setLoading(service, false);
    }
  };

  const connectionBlocks: ConnectionBlock[] = [
    {
      id: 'calendar',
      title: 'Calendar',
      icon: Calendar,
      color: 'text-gray-900 dark:text-white',
      bgColor: '',
      hoverColor: '',
      connected: connectionStatus.calendar,
      onConnect: async () => {
        try {
          setLoading('calendar', true);
          await onAuthenticateCalendar();
          toast.success('Calendar connected successfully!');
        } catch (error) {
          console.error('Failed to connect calendar:', error);
          toast.error('Failed to connect calendar. Please try again.');
        } finally {
          setLoading('calendar', false);
        }
      },
      onDisconnect: () => handleDisconnect('calendar')
    },
    {
      id: 'email',
      title: 'Email',
      icon: Mail,
      color: 'text-gray-900 dark:text-white',
      bgColor: '',
      hoverColor: '',
      connected: connectionStatus.email,
      onConnect: async () => {
        try {
          setLoading('email', true);
          await onAuthenticateGmail();
          toast.success('Email connected successfully!');
        } catch (error) {
          console.error('Failed to connect email:', error);
          toast.error('Failed to connect email. Please try again.');
        } finally {
          setLoading('email', false);
        }
      },
      onDisconnect: () => handleDisconnect('email')
    },
    {
      id: 'bills',
      title: 'Bills',
      icon: DollarSign,
      color: 'text-gray-900 dark:text-white',
      bgColor: '',
      hoverColor: '',
      connected: connectionStatus.bills,
      onConnect: async () => {
        try {
          setLoading('bills', true);
          const success = await onAuthenticateBills();
          if (success) {
            toast.success('Bills connected successfully!');
          } else {
            throw new Error('Failed to connect bills');
          }
        } catch (error) {
          console.error('Failed to connect bills:', error);
          toast.error('Failed to connect bills. Please try again.');
        } finally {
          setLoading('bills', false);
        }
      },
      onDisconnect: () => handleDisconnect('bills')
    },
    {
      id: 'phone',
      title: 'Phone',
      icon: Phone,
      color: 'text-gray-900 dark:text-white',
      bgColor: '',
      hoverColor: '',
      connected: connectionStatus.phone,
      onConnect: async () => {
        toast.success('Phone setup is handled in the Daily Call widget');
      },
      onDisconnect: () => handleDisconnect('phone')
    }
  ];

  return (
    <>
      {/* Connection Blocks - Reorganized into sections */}
      <div className="mb-8 space-y-6">
        {/* Your Services */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
            Your Services
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 xl:gap-4 2xl:gap-6">
            {connectionBlocks.filter(b => b.id !== 'bills').map((block) => {
              const Icon = block.icon;
              const isLoading = loadingStates[block.id];

              const getGlassClass = (id: string) => {
                switch (id) {
                  case 'calendar': return 'glass-card-blue';
                  case 'email': return 'glass-card-red';
                  case 'phone': return 'glass-card-purple';
                  default: return 'glass-card';
                }
              };

              return (
                <Card
                  key={block.id}
                  className={`${getGlassClass(block.id)} relative transition-all duration-200 cursor-pointer h-24 sm:h-28`}
                >
                  {/* Status badge */}
                  <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${block.connected ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                    {block.connected ? 'Connected ✅' : 'Not Connected ⚠️'}
                  </span>

                  <CardContent className="p-3 h-full flex items-center justify-between">
                    {/* Left side: Icon and Title */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {isLoading ? (
                          <Loader2 className={`h-5 w-5 sm:h-6 sm:w-6 ${block.color} animate-spin`} />
                        ) : (
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300`} />
                        )}
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm sm:text-base text-gray-900 dark:text-foreground truncate`}>
                          {block.title}
                        </h3>
                      </div>
                    </div>

                    {/* Right side: Action Button */}
                    <div className="flex-shrink-0">
                      {block.connected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEditModal(block.id);
                          }}
                          disabled={isLoading}
                          className={`h-8 w-8 p-0 hover:bg-white/20 dark:hover:bg-white/20 hover:bg-black/10 text-gray-600 dark:text-gray-300`}
                          title="Manage connection"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            block.onConnect();
                          }}
                          disabled={isLoading}
                          className={`h-8 px-3 hover:bg-white/20 dark:hover:bg-white/20 hover:bg-black/10 text-gray-600 dark:text-gray-300 text-xs font-medium`}
                          title="Connect service"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Financial Tools */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
            Financial Tools
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 xl:gap-4 2xl:gap-6">
            {connectionBlocks.filter(b => b.id === 'bills').map((block) => {
              const Icon = block.icon;
              const isLoading = loadingStates[block.id];

              const getGlassClass = 'glass-card-yellow';

              return (
                <Card
                  key={block.id}
                  className={`${getGlassClass} relative transition-all duration-200 cursor-pointer h-24 sm:h-28`}
                >
                  {/* Status badge */}
                  <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${block.connected ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                    {block.connected ? 'Connected ✅' : 'Not Connected ⚠️'}
                  </span>

                  <CardContent className="p-3 h-full flex items-center justify-between">
                    {/* Left side: Icon and Title */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {isLoading ? (
                          <Loader2 className={`h-5 w-5 sm:h-6 sm:w-6 ${block.color} animate-spin`} />
                        ) : (
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${block.color}`} />
                        )}
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm sm:text-base ${block.color} truncate`}>
                          {block.title}
                        </h3>
                      </div>
                    </div>

                    {/* Right side: Action Button */}
                    <div className="flex-shrink-0">
                      {block.connected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEditModal(block.id);
                          }}
                          disabled={isLoading}
                          className={`h-8 w-8 p-0 hover:bg-white/20 dark:hover:bg-white/20 hover:bg-black/10 ${block.color}`}
                          title="Manage connection"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            block.onConnect();
                          }}
                          disabled={isLoading}
                          className={`h-8 px-3 hover:bg-white/20 dark:hover:bg-white/20 hover:bg-black/10 ${block.color} text-xs font-medium`}
                          title="Connect service"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Manage {connectionBlocks.find(b => b.id === showEditModal)?.title} Connection
              </h3>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This service is currently connected. You can disconnect it or manage additional connections.
                </p>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(null)}
                    className="flex-1 bg-white/10 border-white/20 text-gray-900 dark:text-white hover:bg-white/20"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const block = connectionBlocks.find(b => b.id === showEditModal);
                      if (block) {
                        block.onDisconnect();
                        setShowEditModal(null);
                      }
                    }}
                    disabled={loadingStates[showEditModal]}
                    className="flex-1"
                  >
                    {loadingStates[showEditModal] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
