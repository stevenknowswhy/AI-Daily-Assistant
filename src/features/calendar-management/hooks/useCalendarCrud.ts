import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CreateCalendarEventData,
  UpdateCalendarEventData,
  DeleteCalendarEventData,
  CalendarEventApiResponse,
} from '../schemas';

const API_BASE_URL = 'http://localhost:3005/test/calendar';

// Create calendar event
export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<CalendarEventApiResponse, Error, CreateCalendarEventData>({
    mutationFn: async (eventData) => {
      const startDateTime = `${eventData.startDate}T${eventData.startTime}:00`;
      const endDateTime = `${eventData.endDate}T${eventData.endTime}:00`;

      const payload = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: eventData.allDay 
          ? { date: eventData.startDate }
          : { dateTime: startDateTime },
        end: eventData.allDay
          ? { date: eventData.endDate }
          : { dateTime: endDateTime },
        attendees: eventData.attendees 
          ? eventData.attendees.split(',').map(email => ({ email: email.trim() }))
          : [],
      };

      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Event created successfully');
        // Invalidate calendar events query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      } else {
        toast.error(data.error || 'Failed to create event');
      }
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
      toast.error(error.message || 'Failed to create event');
    },
  });
};

// Update calendar event
export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<CalendarEventApiResponse, Error, UpdateCalendarEventData>({
    mutationFn: async (eventData) => {
      const { id, ...updateData } = eventData;
      
      const startDateTime = updateData.startDate && updateData.startTime
        ? `${updateData.startDate}T${updateData.startTime}:00`
        : undefined;
      const endDateTime = updateData.endDate && updateData.endTime
        ? `${updateData.endDate}T${updateData.endTime}:00`
        : undefined;

      const payload: any = {};
      
      if (updateData.summary) payload.summary = updateData.summary;
      if (updateData.description !== undefined) payload.description = updateData.description;
      if (updateData.location !== undefined) payload.location = updateData.location;
      
      if (startDateTime) {
        payload.start = updateData.allDay 
          ? { date: updateData.startDate }
          : { dateTime: startDateTime };
      }
      
      if (endDateTime) {
        payload.end = updateData.allDay
          ? { date: updateData.endDate }
          : { dateTime: endDateTime };
      }
      
      if (updateData.attendees !== undefined) {
        payload.attendees = updateData.attendees 
          ? updateData.attendees.split(',').map(email => ({ email: email.trim() }))
          : [];
      }

      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Event updated successfully');
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      } else {
        toast.error(data.error || 'Failed to update event');
      }
    },
    onError: (error) => {
      console.error('Failed to update event:', error);
      toast.error(error.message || 'Failed to update event');
    },
  });
};

// Delete calendar event
export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<CalendarEventApiResponse, Error, DeleteCalendarEventData>({
    mutationFn: async ({ id }) => {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Event deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      } else {
        toast.error(data.error || 'Failed to delete event');
      }
    },
    onError: (error) => {
      console.error('Failed to delete event:', error);
      toast.error(error.message || 'Failed to delete event');
    },
  });
};
