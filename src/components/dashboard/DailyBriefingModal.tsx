import React, { useState } from 'react';
import { X, RefreshCw, Calendar, Mail, DollarSign, Loader2, Copy, Download, FileText, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BriefingData {
  calendar: any[];
  emails: any[];
  bills: any[];
  upcomingEvents: any[];
  billsDueSoon: any[];
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({ isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefingText, setBriefingText] = useState<string>('');
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const generateDailyBriefing = async () => {
    try {
      setIsGenerating(true);
      setBriefingText('');
      setBriefingData(null);

      toast.loading('Gathering your data...', { id: 'briefing-generation' });

      // Step 1: Aggregate data from all sources
      const [calendarResponse, emailResponse, billsResponse] = await Promise.allSettled([
        // Get calendar events from past 24 hours and upcoming today
        fetch('http://localhost:3005/test/calendar/events').then(r => r.json()),
        // Get Gmail messages from past 24 hours
        fetch('http://localhost:3005/test/gmail/messages?maxResults=20').then(r => r.json()),
        // Get bills data from Supabase
        fetch('http://localhost:3005/api/bills/dashboard-user').then(r => r.json())
      ]);

      const aggregatedData: BriefingData = {
        calendar: calendarResponse.status === 'fulfilled' && calendarResponse.value.success
          ? calendarResponse.value.events || [] : [],
        emails: emailResponse.status === 'fulfilled' && emailResponse.value.success
          ? emailResponse.value.messages || [] : [],
        bills: billsResponse.status === 'fulfilled' && Array.isArray(billsResponse.value)
          ? billsResponse.value : [],
        upcomingEvents: [],
        billsDueSoon: []
      };

      // Filter for today's events and recent emails
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Filter upcoming events for today and past 24 hours
      aggregatedData.upcomingEvents = aggregatedData.calendar.filter(event => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date);
        return eventDate >= yesterday; // Include past 24 hours and future events
      });

      // Filter recent emails (past 24 hours) and sanitize content
      const recentEmails = aggregatedData.emails.filter(email => {
        const emailDate = new Date(email.date || email.internalDate);
        return emailDate >= yesterday;
      }).map(email => ({
        ...email,
        // Sanitize email content to prevent security filter issues
        snippet: email.snippet && typeof email.snippet === 'string'
          ? email.snippet.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .replace(/vbscript:/gi, '')
              .substring(0, 500)
          : '', // Limit snippet length
        body: email.body && typeof email.body === 'string'
          ? email.body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .replace(/vbscript:/gi, '')
              .substring(0, 2000)
          : '', // Limit body length
        subject: email.subject && typeof email.subject === 'string'
          ? email.subject.substring(0, 200)
          : '', // Limit subject length
      }));
      aggregatedData.emails = recentEmails;

      // Filter bills due soon (next 7 days)
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      aggregatedData.billsDueSoon = aggregatedData.bills.filter(bill => {
        const dueDate = new Date(bill.due_date || bill.dueDate);
        return dueDate >= today && dueDate <= nextWeek;
      });

      setBriefingData(aggregatedData);

      toast.loading('Generating your briefing...', { id: 'briefing-generation' });

      // Step 2: Send to OpenRouter LLM for intelligent briefing
      const briefingResponse = await fetch('http://localhost:3005/api/bills/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'dashboard-user',
          data: aggregatedData,
          requestType: 'comprehensive-briefing'
        })
      });

      if (!briefingResponse.ok) {
        throw new Error('Failed to generate briefing');
      }

      const briefingResult = await briefingResponse.json();
      
      if (briefingResult.success) {
        setBriefingText(briefingResult.briefing);
        toast.success('Daily briefing generated!', { id: 'briefing-generation' });
      } else {
        throw new Error(briefingResult.error || 'Failed to generate briefing');
      }

    } catch (error) {
      console.error('Failed to generate daily briefing:', error);
      toast.error('Failed to generate briefing', { id: 'briefing-generation' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Utility function to get current date for filename
  const getCurrentDateString = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Copy to clipboard functionality
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(briefingText);
      setCopySuccess(true);
      toast.success('Briefing copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Download as text file
  const downloadAsText = () => {
    try {
      const blob = new Blob([briefingText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Daily_Briefing_${getCurrentDateString()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Text file downloaded!');
    } catch (error) {
      console.error('Failed to download text file:', error);
      toast.error('Failed to download text file');
    }
  };

  // Download as PDF
  const downloadAsPDF = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;

      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Daily Briefing', margin, 30);

      // Add date
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 45);

      // Add briefing content
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(briefingText, maxWidth);
      pdf.text(lines, margin, 60);

      // Save the PDF
      pdf.save(`Daily_Briefing_${getCurrentDateString()}.pdf`);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Daily Briefing</h2>
          <div className="flex items-center space-x-2">
            <Button
              onClick={generateDailyBriefing}
              disabled={isGenerating}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Briefing'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!briefingText && !isGenerating && (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">Click "Generate Briefing" to get your daily summary</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                This will aggregate your calendar events, emails, and bills for an AI-powered briefing
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600 dark:text-gray-300">Generating your personalized daily briefing...</p>
            </div>
          )}

          {briefingText && (
            <div className="space-y-6">
              {/* Generated Briefing Output Container */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2 text-orange-600" />
                      Your Daily Briefing
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {/* Copy Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="flex items-center space-x-1"
                        disabled={!briefingText}
                      >
                        {copySuccess ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {copySuccess ? 'Copied!' : 'Copy'}
                        </span>
                      </Button>

                      {/* Download as Text Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadAsText}
                        className="flex items-center space-x-1"
                        disabled={!briefingText}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">TXT</span>
                      </Button>

                      {/* Download as PDF Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadAsPDF}
                        className="flex items-center space-x-1"
                        disabled={!briefingText}
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border">
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {briefingText}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row - Mobile Friendly */}
                  <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex items-center space-x-2 flex-1 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      disabled={!briefingText}
                    >
                      {copySuccess ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      )}
                      <span>{copySuccess ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsText}
                      className="flex items-center space-x-2 flex-1 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      disabled={!briefingText}
                    >
                      <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span>Download TXT</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsPDF}
                      className="flex items-center space-x-2 flex-1 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      disabled={!briefingText}
                    >
                      <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span>Download PDF</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Data Summary */}
              {briefingData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                        Calendar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {briefingData.upcomingEvents.length}
                      </div>
                      <p className="text-xs text-gray-500">events today</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-green-600" />
                        Emails
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {briefingData.emails.length}
                      </div>
                      <p className="text-xs text-gray-500">recent messages</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-yellow-600" />
                        Bills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {briefingData.billsDueSoon.length}
                      </div>
                      <p className="text-xs text-gray-500">due soon</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
