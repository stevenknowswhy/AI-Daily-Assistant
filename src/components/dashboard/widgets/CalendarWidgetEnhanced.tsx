import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Loader2, AlertCircle, RefreshCw, Plus, Edit, Trash2, Clock, MapPin, Users, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
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
import { CalendarWidgetProps } from '../../../types/dashboard';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
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

interface EventFormData {
  summary: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendees: string;
}

export const CalendarWidgetEnhanced: React.FC<CalendarWidgetProps> = ({
  connectionStatus,
  calendarTimeRange,
  onAuthenticateCalendar
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  // CRUD state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<EventFormData>({
    summary: '',
    description: '',
    location: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '10:00',
    attendees: ''
  });

  // Fetch calendar events from backend
  const fetchCalendarEvents = useCallback(async () => {
    if (!connectionStatus.calendar) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range based on timeRange
      const now = new Date();
      let maxResults = 10;
      let timeMin = now.toISOString();
      let timeMax: string;

      switch (calendarTimeRange) {
        case '24h':
          maxResults = 5;
          timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          maxResults = 10;
          timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
        default:
          maxResults = 15;
          timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      const response = await fetch(
        `http://localhost:3005/test/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.events) {
        setEvents(data.events);
        setLastFetch(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch calendar events');
      }
    } catch (error) {
      console.error('❌ Failed to fetch calendar events:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch calendar events');
      toast.error('Failed to fetch calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus.calendar, calendarTimeRange]);

  // CRUD Functions
  const handleCreateEvent = async () => {
    if (!formData.summary.trim()) {
      toast.error('Event title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;
      
      const eventData = {
        summary: formData.summary,
        description: formData.description,
        location: formData.location,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
        attendees: formData.attendees ? formData.attendees.split(',').map(email => ({ email: email.trim() })) : []
      };

      const response = await fetch('http://localhost:3005/test/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Event created successfully');
        setShowEventForm(false);
        resetForm();
        fetchCalendarEvents();
      } else {
        throw new Error(result.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !formData.summary.trim()) {
      toast.error('Event title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;
      
      const eventData = {
        summary: formData.summary,
        description: formData.description,
        location: formData.location,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
        attendees: formData.attendees ? formData.attendees.split(',').map(email => ({ email: email.trim() })) : []
      };

      const response = await fetch(`http://localhost:3005/test/calendar/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Event updated successfully');
        setShowEventForm(false);
        setEditingEvent(null);
        resetForm();
        fetchCalendarEvents();
      } else {
        throw new Error(result.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`http://localhost:3005/test/calendar/events/${eventToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Event deleted successfully');
        setShowDeleteDialog(false);
        setEventToDelete(null);
        fetchCalendarEvents();
      } else {
        throw new Error(result.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-fetch events when connected
  useEffect(() => {
    if (connectionStatus.calendar) {
      fetchCalendarEvents();
    }
  }, [connectionStatus.calendar, fetchCalendarEvents]);

  // Real-time sync - auto-refresh every 5 minutes
  useEffect(() => {
    if (!connectionStatus.calendar) return;

    const interval = setInterval(() => {
      fetchCalendarEvents();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [connectionStatus.calendar, fetchCalendarEvents]);

  // Manual refresh
  const handleRefresh = () => {
    fetchCalendarEvents();
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      summary: '',
      description: '',
      location: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '10:00',
      attendees: ''
    });
  };

  const startEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);

    // Parse event data for form
    const startDateTime = event.start.dateTime || event.start.date || '';
    const endDateTime = event.end.dateTime || event.end.date || '';

    const startDate = startDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
    const startTime = startDateTime.includes('T') ? startDateTime.split('T')[1].substring(0, 5) : '09:00';
    const endDate = endDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
    const endTime = endDateTime.includes('T') ? endDateTime.split('T')[1].substring(0, 5) : '10:00';

    setFormData({
      summary: event.summary || '',
      description: event.description || '',
      location: event.location || '',
      startDate,
      startTime,
      endDate,
      endTime,
      attendees: event.attendees?.map(a => a.email).join(', ') || ''
    });

    setShowEventForm(true);
  };

  const startDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setShowDeleteDialog(true);
  };

  // Format event time for display
  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return '';

    const startDate = new Date(start);
    const now = new Date();
    const isToday = startDate.toDateString() === now.toDateString();

    if (event.start.dateTime) {
      // Time-based event
      return isToday
        ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : startDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
          startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // All-day event
      return isToday ? 'All day' : startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Calculate today's events count
  const today = new Date();
  const todayEventsCount = events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate.toDateString() === today.toDateString();
  }).length;

  // Get upcoming events for display
  const upcomingEvents = events.slice(0, 3);

  return (
    <>
      <Card className="glass-card-blue cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-foreground">Calendar</CardTitle>
            {connectionStatus.calendar ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          <div className="flex items-center space-x-2">
            {connectionStatus.calendar && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDetailedView(!showDetailedView)}
                  className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-blue-900"
                  title={showDetailedView ? "Show summary view" : "Show detailed view"}
                >
                  <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    resetForm();
                    setEditingEvent(null);
                    setShowEventForm(true);
                  }}
                  className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-blue-900"
                  title="Create new event"
                >
                  <Plus className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-6 w-6 hover:bg-accent/50 dark:hover:bg-blue-900"
                  title="Refresh calendar events"
                >
                  <RefreshCw className={`h-3 w-3 text-blue-600 dark:text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!connectionStatus.calendar ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect your Google Calendar to see events
              </div>
              <Button
                onClick={onAuthenticateCalendar}
                size="sm"
                className="w-full btn-gray-gradient touch-manipulation min-h-[44px] sm:min-h-[36px]"
              >
                Connect Calendar
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
          ) : showDetailedView ? (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No events found
                  </div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-foreground truncate">
                            {event.summary}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatEventTime(event)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <Users className="h-3 w-3" />
                              <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditEvent(event)}
                            className="h-6 w-6"
                            title="Edit event"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startDeleteEvent(event)}
                            className="h-6 w-6 text-red-600 hover:text-red-700"
                            title="Delete event"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-3">
              {/* Event count display */}
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {isLoading ? '...' : todayEventsCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {todayEventsCount === 1 ? 'event today' : 'events today'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-blue-100 dark:bg-blue-900 rounded-full h-1">
                <div
                  className={`bg-blue-600 h-1 rounded-full transition-all duration-300 ${
                    todayEventsCount === 0 ? 'w-0' :
                    todayEventsCount === 1 ? 'w-1/5' :
                    todayEventsCount === 2 ? 'w-2/5' :
                    todayEventsCount === 3 ? 'w-3/5' :
                    todayEventsCount === 4 ? 'w-4/5' :
                    'w-full'
                  }`}
                />
              </div>

              {/* Upcoming events preview */}
              {upcomingEvents.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Upcoming:
                  </div>
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      <span className="font-medium">{event.summary}</span>
                      <span className="text-gray-500 dark:text-gray-500 ml-1">
                        • {formatEventTime(event)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Last updated */}
              {lastFetch && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Updated {lastFetch.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  resetForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <div className="p-4 space-y-4">
                <div>
                  <Label htmlFor="summary">Title *</Label>
                  <Input
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Event title"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Event description"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Event location"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="attendees">Attendees</Label>
                  <Input
                    id="attendees"
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                disabled={isSubmitting || !formData.summary.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{eventToDelete?.summary}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
