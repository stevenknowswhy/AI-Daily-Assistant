import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, Loader2, AlertCircle, RefreshCw, Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { CalendarEventModal } from './CalendarEventModal';
import { DeleteEventModal } from './DeleteEventModal';
import { useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '../hooks/useCalendarCrud';
import { CalendarEventFormData, CalendarEvent } from '../schemas';

interface CalendarWidgetWithCrudProps {
  connectionStatus: { calendar: boolean };
  calendarTimeRange: '24h' | '7d' | '30d';
  onAuthenticateCalendar: () => void;
  onTimeRangeChange: (range: '24h' | '7d' | '30d') => void;
}

export const CalendarWidgetWithCrud: React.FC<CalendarWidgetWithCrudProps> = ({
  connectionStatus,
  calendarTimeRange: _calendarTimeRange,
  onAuthenticateCalendar,
  onTimeRangeChange: _onTimeRangeChange,
}) => {
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // Mutations
  const createEventMutation = useCreateCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();

  // Fetch calendar events
  const fetchCalendarEvents = useCallback(async () => {
    if (!connectionStatus.calendar) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3005/test/calendar/events');
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
        setLastFetch(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus.calendar]);

  // Load events on mount and connection change
  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Event handlers
  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const handleEventSubmit = async (data: CalendarEventFormData) => {
    try {
      if (editingEvent) {
        await updateEventMutation.mutateAsync({ ...data, id: editingEvent.id });
      } else {
        await createEventMutation.mutateAsync(data);
      }
      setShowEventModal(false);
      setEditingEvent(null);
      fetchCalendarEvents(); // Refresh events
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Event submission failed:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEventMutation.mutateAsync({ id: eventToDelete.id });
      setShowDeleteModal(false);
      setEventToDelete(null);
      fetchCalendarEvents(); // Refresh events
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Event deletion failed:', error);
    }
  };

  // Helper functions
  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.date) {
      // All-day event
      const date = new Date(event.start.date);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today (All day)';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow (All day)';
      } else {
        return `${date.toLocaleDateString()} (All day)`;
      }
    } else if (event.start.dateTime) {
      // Timed event
      const start = new Date(event.start.dateTime);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timeStr = start.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      if (start.toDateString() === today.toDateString()) {
        return `Today ${timeStr}`;
      } else if (start.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow ${timeStr}`;
      } else {
        return `${start.toLocaleDateString()} ${timeStr}`;
      }
    }
    return 'Unknown time';
  };

  // Filter today's events
  const today = new Date();
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate.toDateString() === today.toDateString();
  });

  // Get upcoming events (next 5)
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      return eventDate >= today;
    })
    .sort((a, b) => {
      const dateA = new Date(a.start.dateTime || a.start.date || '');
      const dateB = new Date(b.start.dateTime || b.start.date || '');
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  // Show connection prompt if not connected
  if (!connectionStatus.calendar) {
    return (
      <Card className="glass-card-blue cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4 p-6">
          <Calendar className="h-12 w-12 text-blue-600 dark:text-blue-400 opacity-50" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-foreground mb-2">
              Connect your Google Calendar
            </h3>
            <p className="text-sm text-gray-600 dark:text-muted-foreground mb-4">
              View and manage your calendar events
            </p>
            <Button 
              onClick={onAuthenticateCalendar}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Connect Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card-blue cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
        <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-900 dark:text-foreground">
              Calendar
            </h3>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateEvent}
              className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-blue-900"
              title="Create new event"
            >
              <Plus className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-blue-900"
              title="Toggle detailed view"
            >
              <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchCalendarEvents}
              disabled={isLoading}
              className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-blue-900"
              title="Refresh calendar events"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <RefreshCw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              )}
            </Button>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          {error ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCalendarEvents}
                className="text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {todayEvents.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {todayEvents.length === 1 ? 'event today' : 'events today'}
                </p>
              </div>

              <div className="w-full bg-blue-100 dark:bg-blue-900 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((todayEvents.length / 5) * 100, 100)}%` }}
                />
              </div>

              {showDetailedView && upcomingEvents.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Upcoming Events:
                  </div>
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 p-2 rounded bg-gray-50 dark:bg-gray-800">
                      <div className="flex-1 truncate">
                        <span className="font-medium">{event.summary}</span>
                        <span className="text-gray-500 dark:text-gray-500 ml-1">
                          • {formatEventTime(event)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditEvent(event)}
                          className="h-6 w-6 hover:bg-accent/50"
                          title="Edit event"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvent(event)}
                          className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
                          title="Delete event"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showDetailedView && upcomingEvents.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Upcoming:
                  </div>
                  {upcomingEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      <span className="font-medium">{event.summary}</span>
                      <span className="text-gray-500 dark:text-gray-500 ml-1">
                        • {formatEventTime(event)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {lastFetch && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Updated {lastFetch.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Modal */}
      <CalendarEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onSubmit={handleEventSubmit}
        editingEvent={editingEvent}
        isSubmitting={createEventMutation.isPending || updateEventMutation.isPending}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
      />

      {/* Delete Modal */}
      <DeleteEventModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEventToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        event={eventToDelete}
        isDeleting={deleteEventMutation.isPending}
      />
    </>
  );
};
