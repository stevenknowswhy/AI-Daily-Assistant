import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '../hooks/useCalendarCrud';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock fetch globally
const originalFetch = global.fetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('Calendar CRUD Hooks', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  describe('useCreateCalendarEvent', () => {
    it('creates calendar event successfully', async () => {
      const mockResponse = { success: true, event: { id: 'new-event' } };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateCalendarEvent(), { wrapper });

      const eventData = {
        summary: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        startDate: '2024-01-15',
        startTime: '09:00',
        endDate: '2024-01-15',
        endTime: '10:00',
        attendees: 'test@example.com',
        allDay: false,
      };

      result.current.mutate(eventData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3005/test/calendar/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test Event'),
        })
      );
    });

    it('handles create event error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateCalendarEvent(), { wrapper });

      const eventData = {
        summary: 'Test Event',
        startDate: '2024-01-15',
        startTime: '09:00',
        endDate: '2024-01-15',
        endTime: '10:00',
        allDay: false,
      };

      result.current.mutate(eventData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('handles all-day events correctly', async () => {
      const mockResponse = { success: true, event: { id: 'all-day-event' } };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateCalendarEvent(), { wrapper });

      const eventData = {
        summary: 'All Day Event',
        startDate: '2024-01-15',
        startTime: '09:00', // Should be ignored for all-day
        endDate: '2024-01-15',
        endTime: '10:00', // Should be ignored for all-day
        allDay: true,
      };

      result.current.mutate(eventData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the request body contains date instead of dateTime
      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.start).toEqual({ date: '2024-01-15' });
      expect(requestBody.end).toEqual({ date: '2024-01-15' });
    });
  });

  describe('useUpdateCalendarEvent', () => {
    it('updates calendar event successfully', async () => {
      const mockResponse = { success: true, event: { id: 'updated-event' } };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateCalendarEvent(), { wrapper });

      const updateData = {
        id: 'event-123',
        summary: 'Updated Event',
        startDate: '2024-01-16',
        startTime: '10:00',
        endDate: '2024-01-16',
        endTime: '11:00',
        allDay: false,
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3005/test/calendar/events/event-123',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Updated Event'),
        })
      );
    });

    it('handles partial updates correctly', async () => {
      const mockResponse = { success: true, event: { id: 'updated-event' } };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateCalendarEvent(), { wrapper });

      const updateData = {
        id: 'event-123',
        summary: 'Updated Title Only',
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify only summary is in the request body
      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.summary).toBe('Updated Title Only');
      expect(requestBody.start).toBeUndefined();
      expect(requestBody.end).toBeUndefined();
    });
  });

  describe('useDeleteCalendarEvent', () => {
    it('deletes calendar event successfully', async () => {
      const mockResponse = { success: true };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteCalendarEvent(), { wrapper });

      result.current.mutate({ id: 'event-to-delete' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3005/test/calendar/events/event-to-delete',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('handles delete event error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Delete failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteCalendarEvent(), { wrapper });

      result.current.mutate({ id: 'event-to-delete' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Delete failed');
    });
  });
});
