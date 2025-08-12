import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Calendar, DollarSign, Repeat, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import {
  billSchema,
  updateBillSchema,
  type Bill as BillType,
  type UpdateBill,
  formatCurrency,
  validateAmount,
  validateDueDate
} from '../../shared/schemas';
import {
  handleFormError,
  clearFormErrors,
  getFieldError,
  hasFieldError,
  formatCurrencyForDisplay,
  parseCurrencyString
} from '../../shared/utils/formUtils';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  category: string;
  type: 'bill' | 'subscription';
  reminderPreference?: 'no-reminder' | 'on-due-date' | '1-day' | '2-days' | '3-days';
}

interface BillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBillsChange?: () => void; // Callback to refresh parent component's bills data
}

export const BillsModal: React.FC<BillsModalProps> = ({ isOpen, onClose, onBillsChange }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  // React Hook Form setup
  const billForm = useForm<BillType>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
      category: 'other',
      type: 'bill',
      reminderPreference: '1-day',
      description: '',
      isActive: true,
      isAutoPay: false,
      emailReminders: true,
      smsReminders: false,
    },
  });

  // Load bills when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBills();
    }
  }, [isOpen]);

  const loadBills = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3005/api/bills/dashboard-user', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      let data = [];
      if (response.ok || response.status === 304) {
        if (response.status === 304) {
          // For 304 responses, make a fresh request
          const freshResponse = await fetch(`http://localhost:3005/api/bills/dashboard-user?t=${Date.now()}`);
          if (freshResponse.ok) {
            data = await freshResponse.json();
          }
        } else {
          data = await response.json();
        }

        // Map backend fields to frontend format
        const mappedBills = (data || []).map((bill: any) => ({
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.due_date, // Map due_date to dueDate
          frequency: bill.recurrence_type || 'monthly', // Map recurrence_type to frequency
          category: bill.category,
          type: bill.category === 'entertainment' ? 'subscription' : 'bill' // Infer type from category
        }));

        setBills(mappedBills);
        console.log('💰 Bills loaded and mapped:', mappedBills);

        // Notify parent component of bills data change
        if (onBillsChange) {
          onBillsChange();
        }
      }
    } catch (error) {
      console.error('Failed to load bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: BillType) => {
    try {
      clearFormErrors(billForm);

      const billData = {
        userId: 'dashboard-user',
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate,
        recurrenceType: data.frequency,
        category: data.category,
        description: data.description || `${data.type}: ${data.name}`,
        reminderPreference: data.reminderPreference
      };

      const response = await fetch(`http://localhost:3005/api/bills${editingBill ? `/${editingBill.id}` : ''}`, {
        method: editingBill ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (response.ok) {
        toast.success(editingBill ? 'Bill updated successfully' : 'Bill added successfully');
        loadBills();
        resetForm();
      } else {
        throw new Error('Failed to save bill');
      }
    } catch (error) {
      handleFormError(error, billForm);
      console.error('Failed to save bill:', error);
      toast.error('Failed to save bill');
    }
  };

  const handleDeleteClick = (billId: string) => {
    setBillToDelete(billId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;

    try {
      const response = await fetch(`http://localhost:3005/api/bills/${billToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Bill deleted successfully');
        loadBills();
        if (onBillsChange) {
          onBillsChange();
        }
      } else {
        throw new Error('Failed to delete bill');
      }
    } catch (error) {
      console.error('Failed to delete bill:', error);
      toast.error('Failed to delete bill');
    } finally {
      setDeleteConfirmOpen(false);
      setBillToDelete(null);
    }
  };

  const resetForm = () => {
    billForm.reset({
      name: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      frequency: 'monthly',
      category: 'other',
      type: 'bill',
      reminderPreference: '1-day',
      description: '',
      isActive: true,
      isAutoPay: false,
      emailReminders: true,
      smsReminders: false,
    });
    clearFormErrors(billForm);
    setEditingBill(null);
    setShowAddForm(false);
  };

  const startEdit = (bill: Bill) => {
    setEditingBill(bill);
    billForm.reset({
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
      frequency: bill.frequency,
      category: bill.category,
      type: bill.type,
      reminderPreference: bill.reminderPreference || '1-day',
      description: bill.description || '',
      isActive: bill.isActive ?? true,
      isAutoPay: bill.isAutoPay ?? false,
      emailReminders: bill.emailReminders ?? true,
      smsReminders: bill.smsReminders ?? false,
    });
    setShowAddForm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Bills & Subscriptions</h2>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Bills List */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No bills or subscriptions yet</p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Your First Bill
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bills.map((bill) => (
                  <Card key={bill.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{bill.name}</CardTitle>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(bill)}
                            className="h-6 w-6"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(bill.id)}
                            className="h-6 w-6 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-green-600">${bill.amount}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            bill.type === 'bill' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {bill.type}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due: {new Date(bill.dueDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Repeat className="h-3 w-3 mr-1" />
                          {bill.frequency}
                        </div>
                        {bill.category && (
                          <div className="text-xs text-gray-500">
                            Category: {bill.category}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingBill ? 'Edit' : 'Add'} {billForm.watch('type') === 'bill' ? 'Bill' : 'Subscription'}
                </h3>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={billForm.handleSubmit(handleSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium" htmlFor="bill-type">Type</label>
                  <select
                    id="bill-type"
                    {...billForm.register('type')}
                    className={`w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-700 ${
                      hasFieldError(billForm, 'type') ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="bill">Bill</option>
                    <option value="subscription">Subscription</option>
                    <option value="loan">Loan</option>
                    <option value="insurance">Insurance</option>
                    <option value="utility">Utility</option>
                    <option value="rent">Rent</option>
                    <option value="other">Other</option>
                  </select>
                  {getFieldError(billForm, 'type') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'type')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    {...billForm.register('name')}
                    placeholder="e.g., Electric Bill, Netflix"
                    className={`mt-1 ${hasFieldError(billForm, 'name') ? 'border-red-500' : ''}`}
                  />
                  {getFieldError(billForm, 'name') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'name')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Amount *</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...billForm.register('amount', { valueAsNumber: true })}
                    placeholder="0.00"
                    className={`mt-1 ${hasFieldError(billForm, 'amount') ? 'border-red-500' : ''}`}
                  />
                  {getFieldError(billForm, 'amount') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'amount')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Due Date *</label>
                  <Input
                    type="date"
                    {...billForm.register('dueDate')}
                    className={`mt-1 ${hasFieldError(billForm, 'dueDate') ? 'border-red-500' : ''}`}
                  />
                  {getFieldError(billForm, 'dueDate') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'dueDate')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium" htmlFor="bill-frequency">Frequency</label>
                  <select
                    id="bill-frequency"
                    {...billForm.register('frequency')}
                    className={`w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-700 ${
                      hasFieldError(billForm, 'frequency') ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                  {getFieldError(billForm, 'frequency') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'frequency')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    {...billForm.register('category')}
                    className={`w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-700 ${
                      hasFieldError(billForm, 'category') ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="utilities">Utilities</option>
                    <option value="housing">Housing</option>
                    <option value="transportation">Transportation</option>
                    <option value="food">Food</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="insurance">Insurance</option>
                    <option value="debt">Debt</option>
                    <option value="savings">Savings</option>
                    <option value="other">Other</option>
                  </select>
                  {getFieldError(billForm, 'category') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'category')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium" htmlFor="reminder-preference">Reminder Preference</label>
                  <select
                    id="reminder-preference"
                    {...billForm.register('reminderPreference')}
                    className={`w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-700 ${
                      hasFieldError(billForm, 'reminderPreference') ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="none">No reminder</option>
                    <option value="1-day">1 day before</option>
                    <option value="3-days">3 days before</option>
                    <option value="1-week">1 week before</option>
                    <option value="2-weeks">2 weeks before</option>
                  </select>
                  {getFieldError(billForm, 'reminderPreference') && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError(billForm, 'reminderPreference')}</p>
                  )}
                </div>

                {/* Form Errors */}
                {billForm.formState.errors.root && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{billForm.formState.errors.root.message}</p>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button
                    type="submit"
                    disabled={!billForm.formState.isValid || isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingBill ? 'Update' : 'Add'} {billForm.watch('type') === 'bill' ? 'Bill' : 'Subscription'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bill? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
