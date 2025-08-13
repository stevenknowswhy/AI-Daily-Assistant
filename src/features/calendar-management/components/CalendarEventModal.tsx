import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Calendar, Clock, MapPin, Users, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { CalendarEventFormData, calendarEventSchema, CalendarEvent } from '../schemas';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CalendarEventFormData) => void;
  editingEvent?: CalendarEvent | null;
  isSubmitting?: boolean;
  title: string;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingEvent,
  isSubmitting = false,
  title,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CalendarEventFormData>({
    resolver: zodResolver(calendarEventSchema) as any,
    defaultValues: {
      summary: '',
      description: '',
      location: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '10:00',
      attendees: '',
      allDay: false,
    },
  });

  const allDay = watch('allDay');

  // Populate form when editing
  useEffect(() => {
    if (editingEvent) {
      const startDateTime = editingEvent.start.dateTime || editingEvent.start.date || '';
      const endDateTime = editingEvent.end.dateTime || editingEvent.end.date || '';

      const startDate = startDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
      const startTime = startDateTime.includes('T') ? startDateTime.split('T')[1].substring(0, 5) : '09:00';
      const endDate = endDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
      const endTime = endDateTime.includes('T') ? endDateTime.split('T')[1].substring(0, 5) : '10:00';

      reset({
        summary: editingEvent.summary || '',
        description: editingEvent.description || '',
        location: editingEvent.location || '',
        startDate,
        startTime,
        endDate,
        endTime,
        attendees: editingEvent.attendees?.map((a: any) => a.email).join(', ') || '',
        allDay: !editingEvent.start.dateTime, // All-day events don't have dateTime
      });
    } else {
      reset({
        summary: '',
        description: '',
        location: '',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '10:00',
        attendees: '',
        allDay: false,
      });
    }
  }, [editingEvent, reset]);

  const handleFormSubmit = (data: CalendarEventFormData) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>{title}</span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit as any)} className="p-6 space-y-6">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="summary" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Event Title *</span>
            </Label>
            <Input
              id="summary"
              {...register('summary')}
              placeholder="Enter event title"
              className={errors.summary ? 'border-red-500' : ''}
            />
            {errors.summary && (
              <p className="text-sm text-red-600">{errors.summary.message}</p>
            )}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="allDay"
              checked={allDay}
              onCheckedChange={(checked) => setValue('allDay', checked)}
            />
            <Label htmlFor="allDay">All day event</Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Start Date *</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Start Time *</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register('startTime')}
                  className={errors.startTime ? 'border-red-500' : ''}
                />
                {errors.startTime && (
                  <p className="text-sm text-red-600">{errors.startTime.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>End Date *</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>

            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>End Time *</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register('endTime')}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-600">{errors.endTime.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Enter location"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter event description"
              rows={3}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="attendees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Attendees</span>
            </Label>
            <Input
              id="attendees"
              {...register('attendees')}
              placeholder="Enter email addresses separated by commas"
            />
            <p className="text-sm text-gray-500">
              Separate multiple email addresses with commas
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
