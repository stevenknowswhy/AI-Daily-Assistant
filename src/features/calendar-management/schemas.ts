import { z } from 'zod';

// Calendar event interface (matches Google Calendar API structure)
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  recurrence?: string[];
  creator?: {
    email: string;
    displayName?: string;
  };
}

// Calendar event schema for CRUD operations
export const calendarEventSchema = z.object({
  summary: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().optional(),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().optional(),
  attendees: z.string().optional(), // Comma-separated email addresses
  allDay: z.boolean().default(false),
});

export const createCalendarEventSchema = calendarEventSchema;
export const updateCalendarEventSchema = calendarEventSchema.partial().extend({
  id: z.string().min(1, 'Event ID is required'),
});

export const deleteCalendarEventSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
});

// Types
export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;
export type CreateCalendarEventData = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventData = z.infer<typeof updateCalendarEventSchema>;
export type DeleteCalendarEventData = z.infer<typeof deleteCalendarEventSchema>;

// API response types
export interface CalendarEventApiResponse {
  success: boolean;
  event?: CalendarEvent;
  error?: string;
}

export interface CalendarEventsListResponse {
  success: boolean;
  events?: CalendarEvent[];
  error?: string;
}
