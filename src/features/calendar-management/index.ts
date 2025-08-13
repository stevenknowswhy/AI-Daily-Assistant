// Public API exports for calendar management feature

// Components
export { CalendarWidgetWithCrud } from './components/CalendarWidgetWithCrud';
export { CalendarEventModal } from './components/CalendarEventModal';
export { DeleteEventModal } from './components/DeleteEventModal';

// Hooks
export { 
  useCreateCalendarEvent, 
  useUpdateCalendarEvent, 
  useDeleteCalendarEvent 
} from './hooks/useCalendarCrud';

// Schemas and Types
export {
  calendarEventSchema,
  createCalendarEventSchema,
  updateCalendarEventSchema,
  deleteCalendarEventSchema,
  type CalendarEvent,
  type CalendarEventFormData,
  type CreateCalendarEventData,
  type UpdateCalendarEventData,
  type DeleteCalendarEventData,
  type CalendarEventApiResponse,
  type CalendarEventsListResponse,
} from './schemas';
