import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
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

interface BillsDueTodayKPIProps {
  className?: string;
}

export const BillsDueTodayKPI: React.FC<BillsDueTodayKPIProps> = ({ className = '' }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillsDueToday();
  }, []);

  const fetchBillsDueToday = async () => {
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

      // Filter bills due today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const billsDueToday = allBills.filter((bill: Bill) => {
        const dueDate = new Date(bill.due_date || bill.dueDate || '');
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });

      setBills(billsDueToday);
    } catch (error) {
      console.error('❌ Failed to fetch bills due today:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bills');
      toast.error('Failed to fetch bills due today');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const billsCount = bills.length;

  if (isLoading) {
    return (
        <Card className={`bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-950/20 dark:to-orange-950/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Bills Due Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card className={`bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-950/20 dark:to-orange-950/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Bills Due Today
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load</p>
            </div>
          </CardContent>
        </Card>
    );
  }

  return (
        <Card className={`bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-950/20 dark:to-orange-950/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Bills Due Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
              {billsCount}
            </div>
            <Badge variant={billsCount > 0 ? "destructive" : "secondary"} className="text-xs">
              {billsCount === 0 ? 'None' : billsCount === 1 ? 'Bill' : 'Bills'}
            </Badge>
          </div>
          
          {billsCount > 0 && (
            <div className="flex items-center space-x-1 text-sm">
              <DollarSign className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-600 dark:text-red-400">
                ${totalAmount.toFixed(2)} total
              </span>
            </div>
          )}

          {billsCount === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No bills due today
            </p>
          )}

          {bills.length > 0 && (
            <div className="mt-2 space-y-1">
              {bills.slice(0, 2).map((bill) => (
                <div key={bill.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                    {bill.name}
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
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
