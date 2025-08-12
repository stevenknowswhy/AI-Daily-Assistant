/**
 * Supabase Service for Frontend
 * ============================
 * 
 * Handles bills, subscriptions, and user preferences through the backend API
 */

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurrenceType: 'monthly' | 'quarterly' | 'yearly';
  category: string;
  description?: string;
  autoPay: boolean;
}

export interface BillSummary {
  totalBills: number;
  upcomingBills: Bill[];
  overdueBills: Bill[];
  totalAmount: number;
}

class SupabaseService {
  private baseUrl = 'http://localhost:3005'; // Backend URL

  /**
   * Get user bills and subscriptions
   */
  async getUserBills(userId: string): Promise<Bill[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bills?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        return result.bills || [];
      }

      throw new Error(result.error || 'Failed to fetch bills');
    } catch (error) {
      console.error('Failed to fetch user bills:', error);
      return [];
    }
  }

  /**
   * Add a new bill or subscription
   */
  async addBill(userId: string, billData: Omit<Bill, 'id'>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          ...billData
        })
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to add bill' };
    } catch (error) {
      console.error('Failed to add bill:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get bills summary for dashboard
   */
  async getBillsSummary(userId: string): Promise<BillSummary> {
    try {
      const bills = await this.getUserBills(userId);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcomingBills = bills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return dueDate >= today && dueDate <= nextWeek;
      });

      const overdueBills = bills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return dueDate < today;
      });

      const totalAmount = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);

      return {
        totalBills: bills.length,
        upcomingBills,
        overdueBills,
        totalAmount
      };
    } catch (error) {
      console.error('Failed to get bills summary:', error);
      return {
        totalBills: 0,
        upcomingBills: [],
        overdueBills: [],
        totalAmount: 0
      };
    }
  }

  /**
   * Test Supabase connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test/supabase`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      }

      return { success: false, error: result.error || 'Supabase connection failed' };
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Connect to Supabase (setup user preferences)
   */
  async connectSupabase(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔗 Connecting to Supabase and initializing user...');

      // Initialize user preferences directly (removed testConnection dependency)
      const response = await fetch(`${this.baseUrl}/api/bills/init-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Supabase connected and user initialized successfully');
        console.log('📊 Bills initialized:', result.billCount);
        return { success: true };
      }

      return { success: false, error: result.error || 'Failed to initialize user in Supabase' };
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
export default supabaseService;
