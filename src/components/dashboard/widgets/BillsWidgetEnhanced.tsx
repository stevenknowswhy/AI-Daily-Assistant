import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Loader2, AlertCircle, RefreshCw, Plus, Edit, Trash2, Check, Clock, DollarSign } from 'lucide-react';
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
} from '../../ui/alert-dialog';
import { BillsModal } from '../BillsModal';
import toast from 'react-hot-toast';

interface BillSubscription {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  category: string;
  type: 'bill' | 'subscription';
  reminderPreference?: 'no-reminder' | 'on-due-date' | '1-day' | '2-days' | '3-days';
  isPaid?: boolean;
  auto_pay?: boolean;
  autoPay?: boolean;
}

interface BillsWidgetEnhancedProps {
  connectionStatus: {
    bills: boolean;
  };
  onAuthenticateBills: () => void;
}

export const BillsWidgetEnhanced: React.FC<BillsWidgetEnhancedProps> = ({
  connectionStatus,
  onAuthenticateBills
}) => {
  const [bills, setBills] = useState<BillSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  // CRUD state
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [editingBill, setEditingBill] = useState<BillSubscription | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState<BillSubscription | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bills from Supabase
  const fetchBills = useCallback(async () => {
    if (!connectionStatus.bills) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First ensure authentication
      try {
        const authResponse = await fetch('http://localhost:3005/test/bills/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: 'dashboard-user' })
        });
        const authResult = await authResponse.json();

        if (!authResult.success) {
          console.warn('Bills authentication failed, continuing anyway:', authResult.error);
        }
      } catch (authError) {
        console.warn('Bills authentication request failed, continuing anyway:', authError);
      }

      // Fetch bills with correct endpoint
      const response = await fetch('http://localhost:3005/api/bills/dashboard-user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bills: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // The API returns bills directly as an array, not wrapped in success/bills object
      if (Array.isArray(data)) {
        const processedBills = data.map((bill: any) => ({
          id: bill.id || Math.random().toString(),
          name: bill.name || 'Unknown Bill',
          amount: bill.amount || 0,
          dueDate: bill.due_date || bill.dueDate || new Date().toISOString(),
          frequency: (bill.recurrence_type || bill.frequency || 'monthly') as 'monthly' | 'yearly' | 'weekly' | 'one-time',
          category: bill.category || 'other',
          type: (bill.category === 'entertainment' ? 'subscription' : 'bill') as 'bill' | 'subscription',
          description: bill.description || '',
          autoPay: bill.auto_pay || bill.autoPay || false,
          status: bill.status || 'pending'
        }));

        setBills(processedBills);
        setLastFetch(new Date());
      } else if (data.success && data.bills) {
        // Handle wrapped response format
        setBills(data.bills);
        setLastFetch(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch bills - unexpected response format');
      }
    } catch (error) {
      console.error('❌ Failed to fetch bills:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bills');
      toast.error('Failed to fetch bills');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus.bills]);

  // CRUD Functions
  const handleCreateBill = () => {
    setEditingBill(null);
    setShowBillsModal(true);
  };

  const handleEditBill = (bill: BillSubscription) => {
    setEditingBill(bill);
    setShowBillsModal(true);
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`http://localhost:3005/api/bills/${billToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete bill: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Bill deleted successfully');
        setShowDeleteDialog(false);
        setBillToDelete(null);
        fetchBills();
      } else {
        throw new Error(result.error || 'Failed to delete bill');
      }
    } catch (error) {
      console.error('Failed to delete bill:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (bill: BillSubscription) => {
    try {
      const response = await fetch(`http://localhost:3005/api/bills/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: !bill.isPaid })
      });

      if (!response.ok) {
        throw new Error(`Failed to update bill: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`Bill marked as ${!bill.isPaid ? 'paid' : 'unpaid'}`);
        fetchBills();
      } else {
        throw new Error(result.error || 'Failed to update bill');
      }
    } catch (error) {
      console.error('Failed to update bill:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update bill');
    }
  };

  const startDeleteBill = (bill: BillSubscription) => {
    setBillToDelete(bill);
    setShowDeleteDialog(true);
  };

  // Auto-fetch bills when connected
  useEffect(() => {
    if (connectionStatus.bills) {
      fetchBills();
    }
  }, [connectionStatus.bills, fetchBills]);

  // Real-time sync - auto-refresh every 10 minutes for bills
  useEffect(() => {
    if (!connectionStatus.bills) return;

    const interval = setInterval(() => {
      fetchBills();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [connectionStatus.bills, fetchBills]);

  // Manual refresh
  const handleRefresh = () => {
    fetchBills();
  };

  // Format bill due date
  const formatBillDueDate = (bill: BillSubscription) => {
    const dueDate = new Date(bill.dueDate);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Calculate overdue and upcoming counts
  const now = new Date();
  const overdueBills = bills.filter(bill => !bill.isPaid && new Date(bill.dueDate) < now);
  const upcomingBills = bills.filter(bill => !bill.isPaid && new Date(bill.dueDate) >= now);

  return (
    <>
      <Card className="glass-card-yellow cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span>Bills & Subscriptions</span>
                <Badge variant="secondary">{bills.length}</Badge>
                {overdueBills.length > 0 && (
                  <Badge variant="destructive">{overdueBills.length} Overdue</Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {connectionStatus.bills && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateBill}
                  className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-orange-900"
                  title="Add new bill"
                >
                  <Plus className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-orange-900"
                title="Refresh bills"
              >
                <RefreshCw className={`h-3 w-3 text-orange-600 dark:text-orange-400 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              {isLoading ? (
                <Loader2 className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-spin" />
              ) : error ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!connectionStatus.bills ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect to Supabase to manage bills and subscriptions
              </div>
              <Button
                onClick={onAuthenticateBills}
                size="sm"
                className="w-full btn-gray-gradient touch-manipulation min-h-[44px] sm:min-h-[36px]"
              >
                Connect Bills
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
              {bills.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="mb-2">No bills or subscriptions</div>
                  <Button
                    onClick={handleCreateBill}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Bill
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                  {bills.map((bill) => {
                    const isOverdue = !bill.isPaid && new Date(bill.dueDate) < now;
                    const isDueToday = !bill.isPaid && new Date(bill.dueDate).toDateString() === now.toDateString();

                    return (
                      <div key={bill.id} className={`p-3 rounded-lg border transition-all ${
                        bill.isPaid
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                          : isOverdue
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          : isDueToday
                          ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-start flex-wrap gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1">
                                {bill.name}
                              </h4>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {bill.type}
                                </Badge>
                                {bill.isPaid && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs whitespace-nowrap">
                                    Paid
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">${bill.amount.toFixed(2)}</span>
                              </div>
                              <span className="text-gray-400">•</span>
                              <span className="capitalize whitespace-nowrap">{bill.frequency}</span>
                            </div>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className={`whitespace-nowrap ${
                                  isOverdue ? 'text-red-600 dark:text-red-400 font-medium' :
                                  isDueToday ? 'text-yellow-600 dark:text-yellow-400 font-medium' :
                                  'text-gray-500 dark:text-gray-500'
                                }`}>
                                  {formatBillDueDate(bill)}
                                </span>
                              </div>
                            </div>
                            {bill.category && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize break-words">
                                {bill.category}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col space-y-1 ml-2">
                            {!bill.isPaid && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkAsPaid(bill)}
                                className="h-6 w-6 text-green-600 hover:text-green-700"
                                title="Mark as paid"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBill(bill)}
                              className="h-6 w-6"
                              title="Edit bill"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startDeleteBill(bill)}
                              className="h-6 w-6 text-red-600 hover:text-red-700"
                              title="Delete bill"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          )}
          
          {/* Last updated */}
          {lastFetch && connectionStatus.bills && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Updated {lastFetch.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bills Modal for Create/Edit */}
      <BillsModal
        isOpen={showBillsModal}
        onClose={() => {
          setShowBillsModal(false);
          setEditingBill(null);
        }}
        onBillSaved={() => {
          setShowBillsModal(false);
          setEditingBill(null);
          fetchBills();
        }}
        editingBill={editingBill}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{billToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBill}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
