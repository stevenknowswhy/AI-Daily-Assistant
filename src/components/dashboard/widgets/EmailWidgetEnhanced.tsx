import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Loader2, AlertCircle, RefreshCw, Reply, Trash2, Eye, EyeOff, Star, StarOff, Filter, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  receivedTime: string;
  snippet: string;
  isUnread: boolean;
  labels: string[];
  body?: {
    plainText: string;
    htmlContent: string;
  };
}

interface EmailWidgetEnhancedProps {
  connectionStatus: {
    email: boolean;
  };
  onAuthenticateGmail: () => void;
  dailyCallTime?: string; // Time of last daily call for filtering
}

const EMAIL_FILTER_STORAGE_KEY = 'dashboard.emailWidget.importantOnly';

export const EmailWidgetEnhanced: React.FC<EmailWidgetEnhancedProps> = ({
  connectionStatus,
  onAuthenticateGmail,
  dailyCallTime
}) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  // Filter state
  const [importantOnly, setImportantOnly] = useState(() => {
    try {
      return localStorage.getItem(EMAIL_FILTER_STORAGE_KEY) !== 'false';
    } catch {
      return true; // Default to important only
    }
  });
  
  // Action state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<EmailMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save filter preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EMAIL_FILTER_STORAGE_KEY, importantOnly.toString());
    } catch (error) {
      console.error('Failed to save email filter preference:', error);
    }
  }, [importantOnly]);

  // Fetch emails with time-based filtering
  const fetchEmails = useCallback(async () => {
    if (!connectionStatus.email) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Calculate time range based on daily call time
      const now = new Date();
      let timeMin: string;
      
      if (dailyCallTime) {
        // Use previous daily call time as start
        const [hours, minutes] = dailyCallTime.split(':').map(Number);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(hours, minutes, 0, 0);
        timeMin = yesterday.toISOString();
      } else {
        // Default to last 24 hours
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        timeMin = yesterday.toISOString();
      }

      const timeMax = now.toISOString();
      const maxResults = 20;

      const response = await fetch(
        `http://localhost:3005/test/gmail/messages?maxResults=${maxResults}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&importantOnly=${importantOnly}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.messages) {
        setEmails(data.messages);
        setLastFetch(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch emails');
      }
    } catch (error) {
      console.error('❌ Failed to fetch emails:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch emails');
      toast.error('Failed to fetch emails');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus.email, dailyCallTime, importantOnly]);



  // Auto-fetch emails when connected or filter changes
  useEffect(() => {
    if (connectionStatus.email) {
      fetchEmails();
    }
  }, [connectionStatus.email, fetchEmails]);

  // Real-time sync - auto-refresh every 2 minutes for emails
  useEffect(() => {
    if (!connectionStatus.email) return;

    const interval = setInterval(() => {
      fetchEmails();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [connectionStatus.email, fetchEmails]);

  // Manual refresh
  const handleRefresh = () => {
    fetchEmails();
  };

  // Format email time for display
  const formatEmailTime = (email: EmailMessage) => {
    const emailDate = new Date(email.receivedTime || email.date);
    const now = new Date();
    const isToday = emailDate.toDateString() === now.toDateString();

    return isToday
      ? emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReplyEmail = async (email: EmailMessage) => {
    try {
      // For now, just show a toast - full reply functionality would need a compose modal
      toast.success(`Reply to "${email.subject}" - Feature coming soon!`);
    } catch (error) {
      console.error('Failed to reply to email:', error);
      toast.error('Failed to reply to email');
    }
  };

  const handleDeleteEmail = async () => {
    if (!emailToDelete) return;

    try {
      setIsSubmitting(true);

      const response = await fetch(`http://localhost:3005/test/gmail/messages/${emailToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete email: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Email deleted successfully');
        setShowDeleteDialog(false);
        setEmailToDelete(null);
        fetchEmails();
      } else {
        throw new Error(result.error || 'Failed to delete email');
      }
    } catch (error) {
      console.error('Failed to delete email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRead = async (email: EmailMessage) => {
    try {
      const response = await fetch(`http://localhost:3005/test/gmail/messages/${email.id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: email.isUnread })
      });

      if (!response.ok) {
        throw new Error(`Failed to update email: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Email marked as ${email.isUnread ? 'read' : 'unread'}`);
        fetchEmails();
      } else {
        throw new Error(result.error || 'Failed to update email');
      }
    } catch (error) {
      console.error('Failed to update email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update email');
    }
  };

  const handleToggleImportant = async (email: EmailMessage) => {
    try {
      const isImportant = email.labels.includes('IMPORTANT');

      const response = await fetch(`http://localhost:3005/test/gmail/messages/${email.id}/important`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isImportant: !isImportant })
      });

      if (!response.ok) {
        throw new Error(`Failed to update email: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Email ${!isImportant ? 'marked as important' : 'removed from important'}`);
        fetchEmails();
      } else {
        throw new Error(result.error || 'Failed to update email');
      }
    } catch (error) {
      console.error('Failed to update email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update email');
    }
  };

  const startDeleteEmail = (email: EmailMessage) => {
    setEmailToDelete(email);
    setShowDeleteDialog(true);
  };

  // Calculate unread count
  const unreadCount = emails.filter(email => email.isUnread).length;

  return (
    <>
      <Card className="glass-card-green cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>Recent Emails</span>
                <Badge variant="secondary">{emails.length}</Badge>
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount} unread</Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-green-900"
                title="Refresh emails"
              >
                <RefreshCw className={`h-3 w-3 text-green-600 dark:text-green-400 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {isLoading ? (
                <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400 animate-spin" />
              ) : error ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>
          
          {/* Filter Controls */}
          {connectionStatus.email && (
            <div className="flex items-center space-x-3 pt-2">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label htmlFor="important-filter" className="text-sm text-gray-600 dark:text-gray-400">
                  Important Only
                </Label>
                <Switch
                  id="important-filter"
                  checked={importantOnly}
                  onCheckedChange={setImportantOnly}
                />
              </div>
              {dailyCallTime && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>Since last call ({dailyCallTime})</span>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!connectionStatus.email ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect your Gmail to see recent emails
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
            <ScrollArea className="h-64">
              {emails.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {importantOnly ? 'No important emails' : 'No emails found'}
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map((email) => (
                    <div key={email.id} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className={`font-medium truncate ${email.isUnread ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                              {email.subject}
                            </h4>
                            {email.isUnread && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                            {email.labels.includes('IMPORTANT') && (
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            From: {email.from}
                          </div>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatEmailTime(email)}</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {email.snippet}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReplyEmail(email)}
                            className="h-6 w-6"
                            title="Reply to email"
                          >
                            <Reply className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleRead(email)}
                            className="h-6 w-6"
                            title={email.isUnread ? "Mark as read" : "Mark as unread"}
                          >
                            {email.isUnread ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleImportant(email)}
                            className="h-6 w-6"
                            title={email.labels.includes('IMPORTANT') ? "Remove from important" : "Mark as important"}
                          >
                            {email.labels.includes('IMPORTANT') ? 
                              <StarOff className="h-3 w-3" /> : 
                              <Star className="h-3 w-3" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startDeleteEmail(email)}
                            className="h-6 w-6 text-red-600 hover:text-red-700"
                            title="Delete email"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
          
          {/* Last updated */}
          {lastFetch && connectionStatus.email && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Updated {lastFetch.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the email "{emailToDelete?.subject}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmail}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
