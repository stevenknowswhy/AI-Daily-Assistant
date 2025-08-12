import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, AlertCircle, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
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
  daysUntilDue?: number;
}

interface BillsKPIProps {
  className?: string;
}

type ViewMode = 'due-today' | 'upcoming';

export const BillsKPI: React.FC<BillsKPIProps> = ({ className = '' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('due-today');
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
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

  const fetchBills = async () => {
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
      const bills = Array.isArray(data) ? data : [];
      setAllBills(bills);
    } catch (error) {
      console.error('❌ Failed to fetch bills:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bills');
      toast.error('Failed to fetch bills');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate bills due today
  const billsDueToday = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allBills.filter((bill: Bill) => {
      const dueDate = new Date(bill.due_date || bill.dueDate || '');
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });
  }, [allBills]);

  // Calculate upcoming bills
  const upcomingBills = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allBills.filter((bill: Bill) => {
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...bill,
        daysUntilDue
      };
    }).sort((a: any, b: any) => a.daysUntilDue - b.daysUntilDue);
  }, [allBills]);

  // Calculate monthly totals and outstanding bills
  const monthlyStats = React.useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let monthlyTotal = 0;
    let outstandingTotal = 0;
    
    allBills.forEach(bill => {
      const dueDate = new Date(bill.due_date || bill.dueDate || '');
      
      // Add to monthly total if due this month
      if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
        monthlyTotal += bill.amount || 0;
      }
      
      // Add to outstanding if overdue (assuming bills without auto_pay are outstanding)
      const today = new Date();
      if (dueDate < today && !bill.auto_pay && !bill.autoPay) {
        outstandingTotal += bill.amount || 0;
      }
    });
    
    return { monthlyTotal, outstandingTotal };
  }, [allBills]);

  const currentBills = viewMode === 'due-today' ? billsDueToday : upcomingBills;
  const billsCount = currentBills.length;
  const totalAmount = currentBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

  // Determine styling based on view mode
  const isDueToday = viewMode === 'due-today';
  const gradientClass = isDueToday 
    ? 'from-red-50/80 to-orange-50/80 dark:from-red-950/20 dark:to-orange-950/20'
    : 'from-yellow-50/80 to-amber-50/80 dark:from-yellow-950/20 dark:to-amber-950/20';
  const borderClass = isDueToday
    ? 'border-red-200/50 dark:border-red-800/30'
    : 'border-yellow-200/50 dark:border-yellow-800/30';
  const iconColor = isDueToday
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400';
  const amountColor = isDueToday
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400';

  if (isLoading) {
    return (
      <Card className={`bg-gradient-to-br ${gradientClass} backdrop-blur-sm border ${borderClass} ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
            Bills Overview
          </CardTitle>
          <DollarSign className={`h-4 w-4 ${iconColor}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className={`h-6 w-6 animate-spin ${iconColor}`} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-950/20 dark:to-gray-900/20 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/30 ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
            Bills Overview
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unable to load bills data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br ${gradientClass} backdrop-blur-sm border ${borderClass} shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
            Bills Overview
          </CardTitle>

          {/* Toggle Switch */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'due-today' ? 'upcoming' : 'due-today')}
            className="h-6 px-2 text-xs hover:bg-white/20 dark:hover:bg-gray-800/20"
            title={`Switch to ${viewMode === 'due-today' ? 'upcoming bills' : 'bills due today'}`}
          >
            {viewMode === 'due-today' ? (
              <>
                <ToggleLeft className="h-3 w-3 mr-1" />
                Due Today
              </>
            ) : (
              <>
                <ToggleRight className="h-3 w-3 mr-1" />
                Upcoming
              </>
            )}
          </Button>
        </div>

        {isDueToday ? (
          <Calendar className={`h-4 w-4 ${iconColor}`} />
        ) : (
          <Clock className={`h-4 w-4 ${iconColor}`} />
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Main Count and Badge */}
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
              {billsCount}
            </div>
            <Badge variant={billsCount > 0 ? (isDueToday ? "destructive" : "secondary") : "secondary"} className="text-xs">
              {billsCount === 0 ? 'None' : billsCount === 1 ? 'Bill' : 'Bills'}
            </Badge>
          </div>

          {/* Amount Display */}
          {billsCount > 0 && (
            <div className="flex items-center space-x-1 text-sm">
              <DollarSign className={`h-3 w-3 ${amountColor}`} />
              <span className={`font-medium ${amountColor}`}>
                ${totalAmount.toFixed(2)} total
              </span>
            </div>
          )}

          {/* Monthly Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/30 dark:bg-gray-800/30 rounded-lg p-2">
              <div className="text-gray-600 dark:text-gray-400">This Month</div>
              <div className="font-semibold text-gray-900 dark:text-foreground">
                ${monthlyStats.monthlyTotal.toFixed(2)}
              </div>
            </div>
            <div className="bg-white/30 dark:bg-gray-800/30 rounded-lg p-2">
              <div className="text-gray-600 dark:text-gray-400">Outstanding</div>
              <div className="font-semibold text-gray-900 dark:text-foreground">
                ${monthlyStats.outstandingTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* No Bills Message */}
          {billsCount === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isDueToday ? 'No bills due today' : 'No upcoming bills'}
            </p>
          )}

          {/* Bills List */}
          {currentBills.length > 0 && (
            <div className="mt-2 space-y-1">
              {currentBills.slice(0, 2).map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between text-xs">
                  <div className="flex-1 mr-2">
                    <span className="text-gray-700 dark:text-gray-300 truncate block">
                      {bill.name}
                    </span>
                    {!isDueToday && bill.daysUntilDue && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {bill.daysUntilDue === 1 ? 'Tomorrow' : `${bill.daysUntilDue} days`}
                      </span>
                    )}
                  </div>
                  <span className={`font-medium ${amountColor} whitespace-nowrap`}>
                    ${bill.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {currentBills.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{currentBills.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
