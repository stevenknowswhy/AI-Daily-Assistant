import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import toast from 'react-hot-toast';

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  dueDate?: string;
  category: string;
  reminder_days_before?: number;
  reminderPreference?: string;
  auto_pay?: boolean;
  autoPay?: boolean;
}

interface UpcomingBillsKPIProps {
  className?: string;
}

export const UpcomingBillsKPI: React.FC<UpcomingBillsKPIProps> = ({ className = '' }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingBills();
  }, []);

  const convertReminderPreferenceToDays = (preference: string): number => {
    switch (preference) {
      case 'no-reminder': return 0;
      case 'on-due-date': return 0;
      case '1-day': return 1;
      case '2-days': return 2;
      case '3-days': return 3;
      default: return 1;
    }
  };

  const fetchUpcomingBills = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First authenticate with bills service
      try {
        const authResponse = await fetch('http://localhost:3005/test/bills/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'dashboard-user' })
        });
        const authResult = await authResponse.json();
        if (!authResult.success) {
          console.warn('Bills authentication failed:', authResult.error);
        }
      } catch (authError) {
        console.warn('Bills authentication request failed:', authError);
      }

      // Fetch all bills
      const response = await fetch('http://localhost:3005/api/bills/dashboard-user', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bills: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const allBills = Array.isArray(data) ? data : [];

      // Filter upcoming bills based on individual reminder preferences
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcomingBills = allBills.filter((bill: Bill) => {
        const dueDate = new Date(bill.due_date || bill.dueDate || '');
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get individual reminder preference (default to 1 if not set)
        let reminderDays = bill.reminder_days_before || 1;
        
        // Convert reminderPreference to days if available
        if (bill.reminderPreference) {
          reminderDays = convertReminderPreferenceToDays(bill.reminderPreference);
        }
        
        // Skip bills with no reminder preference
        if (reminderDays === 0) {
          return false;
        }
        
        // Include bills that are upcoming (not due today) and within reminder window
        return daysUntilDue > 0 && daysUntilDue <= reminderDays;
      }).map((bill: Bill) => {
        const dueDate = new Date(bill.due_date || bill.dueDate || '');
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...bill,
          daysUntilDue
        };
      }).sort((a: any, b: any) => a.daysUntilDue - b.daysUntilDue);

      setBills(upcomingBills);
    } catch (error) {
      console.error('❌ Failed to fetch upcoming bills:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bills');
      toast.error('Failed to fetch upcoming bills');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const billsCount = bills.length;

  if (isLoading) {
    return (
        <Card className={`bg-gradient-to-br from-yellow-50/80 to-amber-50/80 dark:from-yellow-950/20 dark:to-amber-950/20 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Upcoming Bills
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card className={`bg-gradient-to-br from-yellow-50/80 to-amber-50/80 dark:from-yellow-950/20 dark:to-amber-950/20 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Upcoming Bills
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Failed to load</p>
            </div>
          </CardContent>
        </Card>
    );
  }

  return (
        <Card className={`bg-gradient-to-br from-yellow-50/80 to-amber-50/80 dark:from-yellow-950/20 dark:to-amber-950/20 backdrop-blur-sm border border-yellow-200/50 dark:border-yellow-800/30 shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Upcoming Bills
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
              {billsCount}
            </div>
            <Badge variant={billsCount > 0 ? "secondary" : "outline"} className="text-xs">
              {billsCount === 0 ? 'None' : billsCount === 1 ? 'Bill' : 'Bills'}
            </Badge>
          </div>
          
          {billsCount > 0 && (
            <div className="flex items-center space-x-1 text-sm">
              <DollarSign className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                ${totalAmount.toFixed(2)} total
              </span>
            </div>
          )}

          {billsCount === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No upcoming bills in reminder window
            </p>
          )}

          {bills.length > 0 && (
            <div className="mt-2 space-y-1">
              {bills.slice(0, 2).map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between text-xs">
                  <div className="flex-1 mr-2">
                    <span className="text-gray-700 dark:text-gray-300 truncate block">
                      {bill.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {bill.daysUntilDue === 1 ? 'Tomorrow' : `${bill.daysUntilDue} days`}
                    </span>
                  </div>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                    ${bill.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {bills.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{bills.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
