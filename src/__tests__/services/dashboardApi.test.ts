import { describe, expect, it } from 'vitest';
import dashboardApi from '../../services/dashboardApi';

describe('dashboardApi', () => {
  it('fetches calendar events from voice endpoint', async () => {
    const events = await dashboardApi.fetchCalendarEvents('24h');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('id');
    expect(events[0]).toHaveProperty('summary');
    expect(events[0]).toHaveProperty('start');
    expect(events[0]).toHaveProperty('end');
  });

  it('fetches emails and maps fields correctly', async () => {
    const emails = await dashboardApi.fetchEmails(10);
    expect(emails.length).toBeGreaterThan(0);
    expect(emails[0]).toHaveProperty('id');
    expect(emails[0]).toHaveProperty('subject');
    expect(emails[0]).toHaveProperty('from');
    expect(emails[0]).toHaveProperty('to');
    expect(emails[0]).toHaveProperty('isUnread');
  });

  it('fetches bills from API', async () => {
    const bills = await dashboardApi.fetchBills();
    expect(bills.length).toBeGreaterThan(0);
    expect(bills[0]).toHaveProperty('id');
    expect(bills[0]).toHaveProperty('name');
    expect(bills[0]).toHaveProperty('amount');
    expect(bills[0]).toHaveProperty('dueDate');
  });

  it('processes voice commands', async () => {
    const response = await dashboardApi.processVoiceCommand('What\'s on my calendar today?');
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('gets daily summary', async () => {
    const summary = await dashboardApi.getDailySummary();
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('checks backend authentication', async () => {
    const authStatus = await dashboardApi.checkBackendAuthentication();
    expect(authStatus).toHaveProperty('authenticated');
    expect(authStatus).toHaveProperty('calendar');
    expect(authStatus).toHaveProperty('gmail');
  });
});

