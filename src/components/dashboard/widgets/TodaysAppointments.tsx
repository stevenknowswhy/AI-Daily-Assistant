import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Loader2, AlertCircle, CalendarX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import toast from 'react-hot-toast';

interface CalendarEvent {
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
  htmlLink?: string;
}

interface TodaysAppointmentsProps {
  className?: string;
  onAuthenticateCalendar?: () => void;
}

export const TodaysAppointments: React.FC<TodaysAppointmentsProps> = ({ 
  className = '',
  onAuthenticateCalendar 
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetchTodaysEvents();
  }, []);

  const fetchTodaysEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setNeedsAuth(false);

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch today's calendar events
      const response = await fetch(
        `http://localhost:3005/test/calendar/events?` +
        `timeMin=${startOfDay.toISOString()}&` +
        `timeMax=${endOfDay.toISOString()}&` +
        `maxResults=10&` +
        `orderBy=startTime&` +
        `singleEvents=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status === 401 || response.status === 403) {
        setNeedsAuth(true);
        setError('Calendar authentication required');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.events) {
        // Filter events to only include today's events
        const todaysEvents = data.events.filter((event: CalendarEvent) => {
          const eventDate = new Date(event.start.dateTime || event.start.date || '');
          const eventDay = new Date(eventDate);
          eventDay.setHours(0, 0, 0, 0);
          
          return eventDay.getTime() === startOfDay.getTime();
        });

        setEvents(todaysEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch today\'s appointments:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch appointments');
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('401')) {
        setNeedsAuth(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventTime = (event: CalendarEvent): string => {
    const startTime = event.start.dateTime || event.start.date;
    const endTime = event.end.dateTime || event.end.date;
    
    if (!startTime) return '';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    
    // All-day events
    if (event.start.date && !event.start.dateTime) {
      return 'All day';
    }
    
    // Timed events
    const startTimeStr = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (end && endTime) {
      const endTimeStr = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${startTimeStr} - ${endTimeStr}`;
    }
    
    return startTimeStr;
  };

  const getEventStatus = (event: CalendarEvent): { color: string; label: string } => {
    if (event.status === 'cancelled') {
      return { color: 'text-red-600 dark:text-red-400', label: 'Cancelled' };
    }
    
    const now = new Date();
    const eventStart = new Date(event.start.dateTime || event.start.date || '');
    const eventEnd = new Date(event.end.dateTime || event.end.date || '');
    
    if (now >= eventStart && now <= eventEnd) {
      return { color: 'text-green-600 dark:text-green-400', label: 'In Progress' };
    } else if (now > eventEnd) {
      return { color: 'text-gray-500 dark:text-gray-400', label: 'Completed' };
    } else {
      return { color: 'text-blue-600 dark:text-blue-400', label: 'Upcoming' };
    }
  };

  if (isLoading) {
    return (
        <Card className={`bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
    );
  }

  if (needsAuth) {
    return (
        <Card className={`bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Today's Appointments
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center py-2 space-y-2">
              <p className="text-sm text-blue-600 dark:text-blue-400">Authentication required</p>
              {onAuthenticateCalendar && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAuthenticateCalendar}
                  className="text-xs"
                >
                  Connect Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
    );
  }

  if (error && !needsAuth) {
    return (
        <Card className={`bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/30 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Today's Appointments
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-sm text-blue-600 dark:text-blue-400">Failed to load</p>
            </div>
          </CardContent>
        </Card>
    );
  }

  return (
        <Card className={`bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/30 shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-muted-foreground">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <CalendarX className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No appointments today
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Enjoy your free day!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
                {events.length}
              </div>
              <Badge variant="secondary" className="text-xs">
                {events.length === 1 ? 'Event' : 'Events'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => {
                const status = getEventStatus(event);
                return (
                  <div key={event.id} className="border-l-2 border-blue-200 dark:border-blue-700 pl-3 py-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {event.summary || 'Untitled Event'}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatEventTime(event)}</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <Users className="h-3 w-3" />
                            <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {events.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  +{events.length - 3} more event{events.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
