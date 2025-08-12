import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Loader2,
  AlertCircle,
  RefreshCw,
  Filter,

  Eye,
  EyeOff,
  Reply,
  Trash2,
  Star,
  StarOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


import { EmailWidgetProps } from '@/types/dashboard';
import toast from 'react-hot-toast';

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to?: string;
  snippet: string;
  isUnread: boolean;
  isImportant?: boolean;
  isStarred?: boolean;
  receivedTime: string;
  attachmentCount?: number;
  labels?: string[];
  body?: {
    plainText?: string;
    html?: string;
  };
}

export const EmailWidget: React.FC<EmailWidgetProps> = ({
  connectionStatus,
  emailCount,
  onAuthenticateGmail,
  onEmailCountChange
}) => {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [showImportantOnly, setShowImportantOnly] = useState(() => {
    return localStorage.getItem('emailWidget_importantOnly') === 'true';
  });
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Fetch Gmail messages from backend
  const fetchGmailMessages = useCallback(async () => {
    if (!connectionStatus.email) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:3005/test/gmail/messages?maxResults=${emailCount}&query=newer_than:1d`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Gmail messages: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.messages) {
        setMessages(data.messages);
        setLastFetch(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch Gmail messages');
      }
    } catch (error) {
      console.error('❌ Failed to fetch Gmail messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch Gmail messages');
      toast.error('Failed to fetch Gmail messages');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus.email, emailCount]);

  // Auto-fetch messages when connected
  useEffect(() => {
    if (connectionStatus.email) {
      fetchGmailMessages();
    }
  }, [connectionStatus.email, fetchGmailMessages]);

  // Manual refresh
  const handleRefresh = () => {
    fetchGmailMessages();
  };

  const handleImportantToggle = useCallback((checked: boolean) => {
    setShowImportantOnly(checked);
    localStorage.setItem('emailWidget_importantOnly', checked.toString());
  }, []);

  const setEmailActionLoading = (emailId: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [emailId]: loading }));
  };

  const handleEmailAction = async (action: string, email: GmailMessage) => {
    try {
      setEmailActionLoading(email.id, true);

      const response = await fetch(`http://localhost:3005/test/gmail/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: email.id,
          threadId: email.threadId,
          ...(action === 'reply' && {
            to: email.from,
            subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            body: `\n\n--- Original Message ---\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.snippet}`
          })
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Email ${action} successful`);

        // Update local state based on action
        if (action === 'delete') {
          setMessages(prev => prev.filter(msg => msg.id !== email.id));
          onEmailCountChange?.(messages.length - 1);
        } else if (action === 'markRead' || action === 'markUnread') {
          setMessages(prev => prev.map(msg =>
            msg.id === email.id
              ? { ...msg, isUnread: action === 'markUnread' }
              : msg
          ));
        } else if (action === 'star' || action === 'unstar') {
          setMessages(prev => prev.map(msg =>
            msg.id === email.id
              ? { ...msg, isStarred: action === 'star' }
              : msg
          ));
        }
      } else {
        throw new Error(result.error || `Failed to ${action} email`);
      }
    } catch (error) {
      console.error(`Email ${action} failed:`, error);
      toast.error(`Failed to ${action} email. Please try again.`);
    } finally {
      setEmailActionLoading(email.id, false);
    }
  };

  // Format sender name
  const formatSender = (from: string) => {
    // Extract name from "Name <email@domain.com>" format
    const match = from.match(/^(.+?)\s*<.+>$/);
    if (match) {
      return match[1].replace(/"/g, '').trim();
    }
    return from.split('@')[0]; // Fallback to email username
  };

  // Format received date
  const formatDate = (dateStr: string) => {
    if (!dateStr) {
      return 'Unknown';
    }

    try {
      const date = new Date(dateStr);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: diffDays > 365 ? 'numeric' : undefined
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Filter messages based on important toggle
  const filteredMessages = showImportantOnly
    ? messages.filter(msg => msg.isImportant || msg.isStarred || msg.isUnread)
    : messages;

  // Get unread messages count
  const unreadCount = filteredMessages.filter(msg => msg.isUnread).length;

  // Get recent messages for display (show more messages with scrolling)
  const recentMessages = filteredMessages.slice(0, 8);

  return (
    <Card className="glass-card-red cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-sm font-medium">Email</CardTitle>
          {connectionStatus.email ? (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          ) : (
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          )}
          {showImportantOnly && (
            <span className="inline-flex items-center" title="Showing important emails only">
              <Filter className="h-3 w-3 text-red-600 dark:text-red-400" />
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {connectionStatus.email && (
            <>
              <Button
                variant={showImportantOnly ? "default" : "ghost"}
                size="sm"
                onClick={() => handleImportantToggle(!showImportantOnly)}
                className={`h-6 px-2 text-xs ${
                  showImportantOnly
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'hover:bg-accent/50 dark:hover:bg-red-900 text-red-600 dark:text-red-400'
                }`}
                title="Toggle important emails filter"
              >
                <Filter className="h-3 w-3 mr-1" />
                Important
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-red-900"
                title="Refresh emails"
              >
                <RefreshCw className={`h-3 w-3 text-red-600 dark:text-red-400 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </>
          )}
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-red-600 dark:text-red-400 animate-spin" />
          ) : error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Mail className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!connectionStatus.email ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Connect your Gmail to see messages
            </div>
            <Button
              onClick={onAuthenticateGmail}
              size="sm"
              className="w-full btn-gray-gradient touch-manipulation min-h-[44px] sm:min-h-[36px]"
            >
              Connect Gmail
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Unread count display */}
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {isLoading ? '...' : unreadCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {unreadCount === 1 ? 'unread email' : 'unread emails'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-red-100 dark:bg-red-900 rounded-full h-1">
              <div
                className={`bg-red-600 h-1 rounded-full transition-all duration-300 ${
                  unreadCount === 0 ? 'w-0' :
                  unreadCount <= emailCount * 0.2 ? 'w-1/5' :
                  unreadCount <= emailCount * 0.4 ? 'w-2/5' :
                  unreadCount <= emailCount * 0.6 ? 'w-3/5' :
                  unreadCount <= emailCount * 0.8 ? 'w-4/5' :
                  'w-full'
                }`}
              />
            </div>

            {/* Recent messages preview with scrolling */}
            {recentMessages.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Recent:
                </div>
                <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 pr-1">
                  <div className="space-y-2">
                    {recentMessages.map((message) => (
                      <div key={message.id} className="group space-y-1 pb-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-red-50 dark:hover:bg-red-900/10 rounded px-1 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 flex-1 min-w-0">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                              {formatSender(message.from)}
                            </span>
                            {message.isImportant && (
                              <div className="w-1 h-1 bg-yellow-500 rounded-full flex-shrink-0" title="Important" />
                            )}
                            {message.isStarred && (
                              <span className="inline-flex items-center" title="Starred">
                                <Star className="w-2 h-2 text-yellow-500 fill-current flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(message.receivedTime)}
                            </span>
                            {message.isUnread && (
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                            )}
                            {/* Action buttons - show on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEmailAction(message.isUnread ? 'markRead' : 'markUnread', message)}
                                disabled={actionLoading[message.id]}
                                className="h-4 w-4 hover:bg-accent/50 dark:hover:bg-red-900"
                                title={message.isUnread ? 'Mark as read' : 'Mark as unread'}
                              >
                                {actionLoading[message.id] ? (
                                  <Loader2 className="h-2 w-2 animate-spin" />
                                ) : message.isUnread ? (
                                  <Eye className="h-2 w-2" />
                                ) : (
                                  <EyeOff className="h-2 w-2" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEmailAction(message.isStarred ? 'unstar' : 'star', message)}
                                disabled={actionLoading[message.id]}
                                className="h-4 w-4 hover:bg-accent/50 dark:hover:bg-red-900"
                                title={message.isStarred ? 'Remove star' : 'Add star'}
                              >
                                {message.isStarred ? (
                                  <StarOff className="h-2 w-2" />
                                ) : (
                                  <Star className="h-2 w-2" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEmailAction('reply', message)}
                                disabled={actionLoading[message.id]}
                                className="h-4 w-4 hover:bg-accent/50 dark:hover:bg-red-900"
                                title="Reply"
                              >
                                <Reply className="h-2 w-2" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEmailAction('delete', message)}
                                disabled={actionLoading[message.id]}
                                className="h-4 w-4 hover:bg-accent/50 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="h-2 w-2" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {message.subject}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                          {message.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Total messages info */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
              <span>{messages.length} total messages</span>
              {lastFetch && (
                <span>Updated {lastFetch.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
