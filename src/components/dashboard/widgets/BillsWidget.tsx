import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Suspense, lazy } from 'react';
const BillsModal = lazy(() => import('../BillsModal').then(m => ({ default: m.BillsModal })));
import { BillsWidgetProps } from '@/types/dashboard';

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  is_active: boolean;
}

export const BillsWidget: React.FC<BillsWidgetProps> = ({
  connectionStatus,
  showBillsModal,
  onOpenBillsModal,
  onCloseBillsModal,
  onAuthenticateBills
}) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug log for connection status
  console.log('🔍 BillsWidget render:', {
    connectionStatus: connectionStatus.bills,
    billsCount: bills.length,
    isLoading,
    error,
    hasAuthFunction: !!onAuthenticateBills
  });

  // Calculate bills due this week
  const calculateBillsThisWeek = (bills: Bill[]) => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return bills.filter(bill => {
      const dueDate = new Date(bill.due_date);
      return dueDate >= now && dueDate <= oneWeekFromNow && bill.is_active;
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  // Format due date for display
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Calculate total amount
  const calculateTotalAmount = (bills: Bill[]) => {
    return bills
      .filter(bill => bill.is_active)
      .reduce((total, bill) => total + (bill.amount || 0), 0);
  };

  // Fetch bills data
  const fetchBills = useCallback(async () => {
    // Try to fetch bills regardless of connection status as a fallback
    // The backend will handle authentication automatically

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3005/api/bills/dashboard-user');

      if (response.ok || response.status === 304) {
        let billsData = [];

        if (response.status === 304) {
          // For 304 responses, make a fresh request with cache-busting
          const freshResponse = await fetch(`http://localhost:3005/api/bills/dashboard-user?t=${Date.now()}`);
          if (freshResponse.ok) {
            billsData = await freshResponse.json();
          }
        } else {
          billsData = await response.json();
        }

        setBills(billsData || []);
        console.log('✅ Bills loaded successfully:', billsData?.length || 0, 'bills');
      } else {
        const errorText = `Failed to fetch bills: ${response.status} ${response.statusText}`;
        setError(errorText);
        console.error(errorText);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Error fetching bills: ${errorMessage}`);
      console.error('Error fetching bills:', error);
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus.bills]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchBills();
  }, [fetchBills]);

  // Handle authentication
  const handleAuthenticate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 BillsWidget: Attempting authentication...');

      await onAuthenticateBills();
      if (true) {
        console.log('✅ BillsWidget: Authentication successful');
        // Force a refresh after authentication
        setTimeout(() => {
          fetchBills();
        }, 1000);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      console.error('❌ BillsWidget: Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onAuthenticateBills, fetchBills]);

  // Load bills when connection status changes
  useEffect(() => {
    console.log('🔄 BillsWidget: Connection status changed:', {
      connected: connectionStatus.bills,
      billsCount: bills.length,
      isLoading,
      error
    });

    if (connectionStatus.bills) {
      fetchBills();
    } else {
      // Try to fetch bills anyway in case the connection status is not properly detected
      // This is a fallback mechanism
      fetchBills().catch(() => {
        // If fetch fails, reset state
        setBills([]);
        setIsLoading(false);
        setError(null);
      });
    }
  }, [connectionStatus.bills, fetchBills]);

  // Initial load on component mount
  useEffect(() => {
    console.log('🔄 BillsWidget: Component mounted, attempting initial load...');
    fetchBills();
  }, []); // Only run once on mount

  const billsDueThisWeek = calculateBillsThisWeek(bills);
  const totalAmount = calculateTotalAmount(bills);
  const formattedTotal = totalAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return (
    <>
      <Card
        className="glass-card-yellow cursor-pointer touch-manipulation"
        onClick={onOpenBillsModal}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-medium">Bills & Subscriptions</CardTitle>
            {connectionStatus.bills ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          <div className="flex items-center space-x-2">
            {connectionStatus.bills && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-yellow-900"
                title="Refresh bills"
              >
                <RefreshCw className={`h-3 w-3 text-yellow-600 dark:text-yellow-400 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
            ) : error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!connectionStatus.bills ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect to Supabase to see your bills and subscriptions
              </div>
              <Button
                onClick={handleAuthenticate}
                size="sm"
                disabled={isLoading}
                className="w-full btn-gray-gradient touch-manipulation min-h-[44px] sm:min-h-[36px] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect to Supabase'
                )}
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
              {/* Bills amount display */}
              <div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {isLoading ? '...' : formattedTotal}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? 'Loading bills...' :
                   bills.length === 0 ? 'No bills found' :
                   `${billsDueThisWeek.length} bill${billsDueThisWeek.length !== 1 ? 's' : ''} due this week`
                  }
                </p>
              </div>

              {/* Weekly Preview */}
              {!isLoading && (
                <div className="space-y-2">
                  {billsDueThisWeek.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No bills due this week
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {billsDueThisWeek.slice(0, 3).map((bill) => (
                        <div key={bill.id} className="flex items-center justify-between text-xs">
                          <div className="flex-1 truncate">
                            <span className="font-medium text-yellow-700 dark:text-yellow-300">
                              {bill.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <span>{formatAmount(bill.amount)}</span>
                            <span>•</span>
                            <span>{formatDueDate(bill.due_date)}</span>
                          </div>
                        </div>
                      ))}
                      {billsDueThisWeek.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center pt-1">
                          +{billsDueThisWeek.length - 3} more bill{billsDueThisWeek.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full bg-yellow-100 dark:bg-yellow-900 rounded-full h-1">
                <div
                  className={`bg-yellow-600 h-1 rounded-full transition-all duration-300 ${
                    isLoading ? 'w-1/2 animate-pulse' :
                    billsDueThisWeek.length === 0 ? 'w-1/12' :
                    billsDueThisWeek.length === 1 ? 'w-1/4' :
                    billsDueThisWeek.length === 2 ? 'w-1/2' :
                    billsDueThisWeek.length === 3 ? 'w-3/4' :
                    'w-full'
                  }`}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bills Modal */}
      <Suspense fallback={null}>
        <BillsModal
          isOpen={showBillsModal}
          onClose={onCloseBillsModal}
        />
      </Suspense>
    </>
  );
};
