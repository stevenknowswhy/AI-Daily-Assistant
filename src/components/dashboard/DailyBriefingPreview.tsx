import React, { useState, useEffect } from 'react';
import { Calendar, Mail, CreditCard, FileText, RefreshCw, Loader2, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarWidgetEnhanced } from './widgets/CalendarWidgetEnhanced';
import { EmailWidgetEnhanced } from './widgets/EmailWidgetEnhanced';
import { BillsWidgetEnhanced } from './widgets/BillsWidgetEnhanced';
import { ErrorBoundary } from '../common/ErrorBoundary';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  htmlLink?: string;
}

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

interface BillSubscription {
  id: string;
  name: string;
  amount: number;
  due_date?: string;
  dueDate?: string;
  recurrence_type?: string;
  frequency?: string;
  category: string;
  description?: string;
  auto_pay?: boolean;
  autoPay?: boolean;
}

interface DailyBriefingData {
  calendar: CalendarEvent[];
  emails: EmailMessage[];
  bills: BillSubscription[];
  generatedBriefing: string;
  lastUpdated: string;
}

interface DailyBriefingPreviewProps {
  connectionStatus?: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
  };
  onAuthenticateCalendar?: () => void;
  onAuthenticateGmail?: () => void;
  onAuthenticateBills?: () => void;
}

export const DailyBriefingPreview: React.FC<DailyBriefingPreviewProps> = ({
  connectionStatus = { calendar: false, email: false, bills: false },
  onAuthenticateCalendar = () => {},
  onAuthenticateGmail = () => {},
  onAuthenticateBills = () => {}
}) => {
  const [briefingData, setBriefingData] = useState<DailyBriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [lastBriefingGeneration, setLastBriefingGeneration] = useState<Date | null>(null);

  // Fetch daily briefing data using working API patterns
  const fetchBriefingData = async () => {
    try {
      setError(null);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

      // Fetch calendar events using working endpoint pattern
      let calendarData = { events: [] };
      try {
        const today = new Date();
        const timeMin = today.toISOString().split('T')[0];
        const calendarResponse = await fetch(
          `${baseUrl}/test/calendar/events?maxResults=10&timeMin=${timeMin}&today=true`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (calendarResponse.ok) {
          const calendarResult = await calendarResponse.json();
          if (calendarResult.success && calendarResult.events) {
            calendarData = { events: calendarResult.events };
          }
        }
      } catch (calendarError) {
        console.warn('Calendar fetch failed:', calendarError.message);
      }

      // Fetch email messages using working endpoint pattern
      let emailData = { messages: [] };
      try {
        const emailResponse = await fetch(
          `${baseUrl}/test/gmail/messages?maxResults=10&query=newer_than:1d`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          if (emailResult.success && emailResult.messages) {
            emailData = { messages: emailResult.messages };
          }
        }
      } catch (emailError) {
        console.warn('Email fetch failed:', emailError.message);
      }

      // Fetch bills and subscriptions using working endpoint pattern
      let billsData = [];
      try {
        const billsResponse = await fetch(`${baseUrl}/api/bills/dashboard-user`);

        if (billsResponse.ok || billsResponse.status === 304) {
          if (billsResponse.status === 304) {
            // For 304 responses, make a fresh request with cache-busting
            const freshResponse = await fetch(`${baseUrl}/api/bills/dashboard-user?t=${Date.now()}`);
            if (freshResponse.ok) {
              billsData = await freshResponse.json();
            }
          } else {
            billsData = await billsResponse.json();
          }
        }
      } catch (billsError) {
        console.warn('Bills fetch failed:', billsError.message);
      }

      // Generate briefing summary using working endpoint pattern
      let briefingText = 'Unable to generate briefing at this time.';
      try {
        const briefingResponse = await fetch(`${baseUrl}/test/daily-briefing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'dashboard-user'
          })
        });

        if (briefingResponse.ok) {
          const briefingResult = await briefingResponse.json();
          if (briefingResult.success && briefingResult.briefing) {
            briefingText = briefingResult.briefing.response || briefingResult.briefing;
          }
        }
      } catch (briefingError) {
        console.warn('Briefing generation failed:', briefingError.message);
      }

      setBriefingData({
        calendar: calendarData.events || [],
        emails: emailData.messages || [],
        bills: billsData || [],
        generatedBriefing: briefingText,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to fetch briefing data:', err);
      setError('Failed to load daily briefing data');
      toast.error('Failed to load daily briefing data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBriefingData();
  }, []);

  // Refresh data
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBriefingData();
  };

  // Refresh briefing generation only
  const refreshBriefing = async () => {
    if (!briefingData) {
      toast.error('No data available to generate briefing');
      return;
    }

    try {
      setIsGeneratingBriefing(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

      // Use current briefing data to regenerate AI summary
      const briefingResponse = await fetch(`${baseUrl}/test/daily-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar: briefingData.calendar,
          emails: briefingData.emails,
          bills: briefingData.bills
        })
      });

      if (!briefingResponse.ok) {
        throw new Error(`Failed to generate briefing: ${briefingResponse.status}`);
      }

      const briefingResult = await briefingResponse.json();

      if (briefingResult.success && briefingResult.briefing) {
        const newBriefingText = briefingResult.briefing.response || briefingResult.briefing;

        // Update only the generated briefing and timestamp
        setBriefingData(prev => prev ? {
          ...prev,
          generatedBriefing: newBriefingText,
          lastUpdated: new Date().toISOString()
        } : null);

        setLastBriefingGeneration(new Date());
        toast.success('Daily briefing refreshed successfully');
      } else {
        throw new Error(briefingResult.error || 'Failed to generate briefing');
      }
    } catch (error) {
      console.error('Failed to refresh briefing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh briefing');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format calendar event time
  const formatEventTime = (event: CalendarEvent) => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Get bill due date
  const getBillDueDate = (bill: BillSubscription) => {
    return bill.due_date || bill.dueDate || new Date().toISOString();
  };

  // Get bill status
  const getBillStatus = (bill: BillSubscription) => {
    const dueDate = new Date(getBillDueDate(bill));
    const now = new Date();

    if (dueDate < now) {
      return 'overdue';
    } else if (dueDate.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000) {
      return 'pending';
    } else {
      return 'paid';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-300">Loading daily briefing...</span>
        </div>
      </div>
    );
  }

  if (error || !briefingData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error || 'No data available'}</div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Briefing Preview</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {formatDate(briefingData.lastUpdated)}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Calendar Widget with CRUD */}
        <ErrorBoundary
          fallbackTitle="Calendar Error"
          fallbackMessage="Failed to load calendar widget. Please try refreshing."
        >
          <CalendarWidgetEnhanced
            connectionStatus={connectionStatus}
            calendarTimeRange="24h"
            onAuthenticateCalendar={onAuthenticateCalendar}
          />
        </ErrorBoundary>

        {/* Enhanced Email Widget with Actions */}
        <ErrorBoundary
          fallbackTitle="Email Error"
          fallbackMessage="Failed to load email widget. Please try refreshing."
        >
          <EmailWidgetEnhanced
            connectionStatus={connectionStatus}
            onAuthenticateGmail={onAuthenticateGmail}
            dailyCallTime="08:00" // Default daily call time - could be made configurable
          />
        </ErrorBoundary>

        {/* Enhanced Bills Widget with CRUD */}
        <ErrorBoundary
          fallbackTitle="Bills Error"
          fallbackMessage="Failed to load bills widget. Please try refreshing."
        >
          <BillsWidgetEnhanced
            connectionStatus={connectionStatus}
            onAuthenticateBills={onAuthenticateBills}
          />
        </ErrorBoundary>

        {/* Generated Daily Briefing */}
        <ErrorBoundary
          fallbackTitle="Briefing Generation Error"
          fallbackMessage="Failed to generate daily briefing. Please try refreshing."
        >
          <Card className="glass-card-purple cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>Generated Briefing</span>
                </CardTitle>
                <CardDescription className="flex items-center space-x-2 mt-1">
                  <span>AI-generated summary of your day</span>
                  {lastBriefingGeneration && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      • Last updated {lastBriefingGeneration.toLocaleTimeString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshBriefing}
                disabled={isGeneratingBriefing || !briefingData}
                className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-purple-900"
                title="Refresh briefing"
              >
                <RefreshCw className={`h-3 w-3 text-purple-600 dark:text-purple-400 ${isGeneratingBriefing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {isGeneratingBriefing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin mx-auto" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Generating your daily briefing...
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {briefingData?.generatedBriefing || 'No briefing generated yet. Click refresh to generate.'}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </ErrorBoundary>
      </div>
    </div>
  );
};
