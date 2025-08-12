interface BriefingData {
  id: string;
  userId: string;
  content: string;
  generatedAt: string;
  preview: string;
  calendarEvents?: any[];
  emails?: any[];
  bills?: any[];
}

interface BriefingResponse {
  success: boolean;
  briefing?: string;
  error?: string;
}

class DailyBriefingService {
  private baseUrl = 'http://localhost:3005';

  /**
   * Generate a daily briefing by aggregating data from all sources
   */
  async generateBriefing(userId: string = 'dashboard-user'): Promise<BriefingResponse> {
    try {
      // Step 1: Aggregate data from all sources
      const [calendarResponse, emailResponse, billsResponse] = await Promise.allSettled([
        // Get calendar events from past 24 hours and upcoming today
        fetch(`${this.baseUrl}/test/calendar/events`).then(r => r.json()),
        // Get Gmail messages from past 24 hours
        fetch(`${this.baseUrl}/test/gmail/messages?maxResults=20`).then(r => r.json()),
        // Get bills data from Supabase
        fetch(`${this.baseUrl}/api/bills/${userId}`).then(r => r.json())
      ]);

      // Extract data from settled promises
      const calendarData = calendarResponse.status === 'fulfilled' ? calendarResponse.value : null;
      const emailData = emailResponse.status === 'fulfilled' ? emailResponse.value : null;
      const billsData = billsResponse.status === 'fulfilled' ? billsResponse.value : null;

      // Step 2: Send aggregated data to backend for LLM processing
      const briefingResponse = await fetch(`${this.baseUrl}/api/daily-briefing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          calendarData: calendarData?.events || [],
          emailData: emailData?.messages || [],
          billsData: Array.isArray(billsData) ? billsData : [],
          isDashboardBriefing: true
        })
      });

      if (!briefingResponse.ok) {
        throw new Error(`Briefing generation failed: ${briefingResponse.status}`);
      }

      const result = await briefingResponse.json();
      
      if (result.success && result.briefing) {
        // Save the briefing to local storage and potentially Supabase
        await this.saveBriefing(userId, {
          content: result.briefing.response || result.briefing,
          calendarEvents: calendarData?.events || [],
          emails: emailData?.messages || [],
          bills: Array.isArray(billsData) ? billsData : []
        });

        return {
          success: true,
          briefing: result.briefing.response || result.briefing
        };
      } else {
        throw new Error(result.error || 'Failed to generate briefing');
      }
    } catch (error) {
      console.error('Failed to generate briefing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate briefing'
      };
    }
  }

  /**
   * Save briefing to localStorage and attempt to save to Supabase
   */
  private async saveBriefing(userId: string, data: {
    content: string;
    calendarEvents: any[];
    emails: any[];
    bills: any[];
  }): Promise<void> {
    const briefingData: BriefingData = {
      id: Date.now().toString(),
      userId,
      content: data.content,
      generatedAt: new Date().toISOString(),
      preview: this.generatePreview(data.content),
      calendarEvents: data.calendarEvents,
      emails: data.emails,
      bills: data.bills
    };

    // Save to localStorage
    localStorage.setItem('dailyBriefingPreview', JSON.stringify(briefingData));

    // Attempt to save to Supabase (optional - won't fail if service is unavailable)
    try {
      await fetch(`${this.baseUrl}/api/daily-briefing/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefingData)
      });
    } catch (error) {
      console.warn('Failed to save briefing to Supabase:', error);
      // Don't throw - localStorage save is sufficient
    }
  }

  /**
   * Get the latest briefing for a user
   */
  async getBriefing(userId: string = 'dashboard-user'): Promise<BriefingData | null> {
    // First try to get from localStorage
    const savedPreview = localStorage.getItem('dailyBriefingPreview');
    if (savedPreview) {
      try {
        const briefing = JSON.parse(savedPreview);
        // Check if briefing is from today
        const briefingDate = new Date(briefing.generatedAt);
        const today = new Date();
        if (briefingDate.toDateString() === today.toDateString()) {
          return briefing;
        }
      } catch (error) {
        console.error('Failed to parse saved briefing:', error);
        localStorage.removeItem('dailyBriefingPreview');
      }
    }

    // Try to get from Supabase
    try {
      const response = await fetch(`${this.baseUrl}/api/daily-briefing/${userId}`);
      if (response.ok) {
        const briefing = await response.json();
        if (briefing) {
          // Save to localStorage for faster access
          localStorage.setItem('dailyBriefingPreview', JSON.stringify(briefing));
          return briefing;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch briefing from Supabase:', error);
    }

    return null;
  }

  /**
   * Generate a preview of the briefing content
   */
  private generatePreview(content: string): string {
    if (!content) return 'No briefing content available';
    
    // Remove markdown formatting and get first 100 characters
    const cleanContent = content
      .replace(/[#*`]/g, '') // Remove markdown
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    return cleanContent.length > 100 
      ? cleanContent.substring(0, 100) + '...'
      : cleanContent;
  }

  /**
   * Check if a briefing exists for today
   */
  async hasTodaysBriefing(userId: string = 'dashboard-user'): Promise<boolean> {
    const briefing = await this.getBriefing(userId);
    if (!briefing) return false;

    const briefingDate = new Date(briefing.generatedAt);
    const today = new Date();
    return briefingDate.toDateString() === today.toDateString();
  }

  /**
   * Clear the current briefing (for regeneration)
   */
  clearBriefing(): void {
    localStorage.removeItem('dailyBriefingPreview');
  }
}

export const dailyBriefingService = new DailyBriefingService();
export type { BriefingData, BriefingResponse };
