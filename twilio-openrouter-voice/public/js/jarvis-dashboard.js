/**
 * JARVIS Dashboard Component
 * =========================
 * 
 * Real-time dashboard for calendar, email, and bill management
 * with live updates and interactive widgets.
 */

class JarvisDashboard {
    constructor() {
        this.updateInterval = null;
        this.refreshRate = 30000; // 30 seconds
        this.data = {
            calendar: [],
            emails: [],
            bills: [],
            briefing: null
        };
        
        this.initialize();
    }

    /**
     * Initialize dashboard
     */
    async initialize() {
        this.setupAutoRefresh();
        await this.loadAllData();
        this.renderDashboard();
    }

    /**
     * Setup automatic data refresh
     */
    setupAutoRefresh() {
        this.updateInterval = setInterval(async () => {
            await this.loadAllData();
            this.updateDashboard();
        }, this.refreshRate);
    }

    /**
     * Load all dashboard data
     */
    async loadAllData() {
        try {
            await Promise.all([
                this.loadCalendarData(),
                this.loadEmailData(),
                this.loadBillsData()
            ]);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    /**
     * Load calendar data
     */
    async loadCalendarData() {
        try {
            const response = await fetch('/api/jarvis/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "What's on my calendar today?",
                    userId: 'dashboard-user'
                })
            });

            const result = await response.json();
            if (result.success && result.toolResults) {
                const calendarResult = result.toolResults.find(r => r.functionName === 'get_calendar_events');
                if (calendarResult && calendarResult.result.success) {
                    this.data.calendar = calendarResult.result.events || [];
                }
            }
        } catch (error) {
            console.error('Failed to load calendar data:', error);
        }
    }

    /**
     * Load email data
     */
    async loadEmailData() {
        try {
            const response = await fetch('/api/jarvis/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "Check my recent emails",
                    userId: 'dashboard-user'
                })
            });

            const result = await response.json();
            if (result.success && result.toolResults) {
                const emailResult = result.toolResults.find(r => r.functionName === 'get_recent_emails');
                if (emailResult && emailResult.result.success) {
                    this.data.emails = emailResult.result.emails || [];
                }
            }
        } catch (error) {
            console.error('Failed to load email data:', error);
        }
    }

    /**
     * Load bills data
     */
    async loadBillsData() {
        try {
            const response = await fetch('/api/jarvis/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "What bills are due soon?",
                    userId: 'dashboard-user'
                })
            });

            const result = await response.json();
            if (result.success && result.toolResults) {
                const billsResult = result.toolResults.find(r => r.functionName === 'get_bills_due_soon');
                if (billsResult && billsResult.result.success) {
                    this.data.bills = billsResult.result.bills || [];
                }
            }
        } catch (error) {
            console.error('Failed to load bills data:', error);
        }
    }

    /**
     * Render complete dashboard
     */
    renderDashboard() {
        this.renderCalendarWidget();
        this.renderEmailWidget();
        this.renderBillsWidget();
        this.renderStatsWidget();
    }

    /**
     * Update dashboard with new data
     */
    updateDashboard() {
        this.renderDashboard();
        this.showUpdateNotification();
    }

    /**
     * Render calendar widget
     */
    renderCalendarWidget() {
        const container = document.getElementById('calendarWidget');
        if (!container) return;

        const events = this.data.calendar.slice(0, 3); // Show next 3 events
        
        container.innerHTML = `
            <div class="glass-card p-4">
                <h3 class="text-lg font-semibold mb-3 flex items-center">
                    📅 <span class="ml-2">Today's Schedule</span>
                    <span class="ml-auto text-sm text-gray-400">${events.length} events</span>
                </h3>
                <div class="space-y-2">
                    ${events.length > 0 ? events.map(event => `
                        <div class="p-3 rounded-lg bg-white bg-opacity-5 hover:bg-opacity-10 transition-all">
                            <div class="font-medium text-sm">${this.escapeHtml(event.title)}</div>
                            <div class="text-xs text-gray-400 mt-1">
                                ${this.formatEventTime(event.start)} - ${this.formatEventTime(event.end)}
                            </div>
                            ${event.location ? `<div class="text-xs text-blue-400 mt-1">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                        </div>
                    `).join('') : `
                        <div class="text-center text-gray-400 py-4">
                            <div class="text-2xl mb-2">🗓️</div>
                            <div>No events scheduled for today</div>
                        </div>
                    `}
                </div>
                ${events.length > 0 ? `
                    <button class="w-full mt-3 p-2 text-sm text-blue-400 hover:text-blue-300 transition-colors quick-action" 
                            data-message="Show me my full calendar for today">
                        View Full Calendar
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render email widget
     */
    renderEmailWidget() {
        const container = document.getElementById('emailWidget');
        if (!container) return;

        const emails = this.data.emails.slice(0, 3); // Show recent 3 emails
        const unreadCount = emails.filter(email => email.isUnread).length;
        
        container.innerHTML = `
            <div class="glass-card p-4">
                <h3 class="text-lg font-semibold mb-3 flex items-center">
                    📧 <span class="ml-2">Recent Emails</span>
                    ${unreadCount > 0 ? `<span class="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">${unreadCount}</span>` : ''}
                </h3>
                <div class="space-y-2">
                    ${emails.length > 0 ? emails.map(email => `
                        <div class="p-3 rounded-lg bg-white bg-opacity-5 hover:bg-opacity-10 transition-all ${email.isUnread ? 'border-l-2 border-blue-400' : ''}">
                            <div class="font-medium text-sm flex items-center">
                                ${email.isUnread ? '<div class="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>' : ''}
                                ${this.escapeHtml(email.from)}
                            </div>
                            <div class="text-xs text-gray-300 mt-1">${this.escapeHtml(email.subject)}</div>
                            <div class="text-xs text-gray-400 mt-1">${this.formatDate(email.date)}</div>
                        </div>
                    `).join('') : `
                        <div class="text-center text-gray-400 py-4">
                            <div class="text-2xl mb-2">📬</div>
                            <div>No recent emails</div>
                        </div>
                    `}
                </div>
                ${emails.length > 0 ? `
                    <button class="w-full mt-3 p-2 text-sm text-blue-400 hover:text-blue-300 transition-colors quick-action" 
                            data-message="Show me more details about my recent emails">
                        View All Emails
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render bills widget
     */
    renderBillsWidget() {
        const container = document.getElementById('billsWidget');
        if (!container) return;

        const bills = this.data.bills.slice(0, 3); // Show next 3 bills
        const totalAmount = bills.reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);
        
        container.innerHTML = `
            <div class="glass-card p-4">
                <h3 class="text-lg font-semibold mb-3 flex items-center">
                    💰 <span class="ml-2">Upcoming Bills</span>
                    <span class="ml-auto text-sm text-gray-400">$${totalAmount.toFixed(2)}</span>
                </h3>
                <div class="space-y-2">
                    ${bills.length > 0 ? bills.map(bill => `
                        <div class="p-3 rounded-lg bg-white bg-opacity-5 hover:bg-opacity-10 transition-all">
                            <div class="font-medium text-sm flex justify-between">
                                <span>${this.escapeHtml(bill.name)}</span>
                                <span class="text-green-400">$${parseFloat(bill.amount || 0).toFixed(2)}</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-1">Due: ${this.formatDate(bill.dueDate)}</div>
                            ${bill.category ? `<div class="text-xs text-blue-400 mt-1">${this.escapeHtml(bill.category)}</div>` : ''}
                        </div>
                    `).join('') : `
                        <div class="text-center text-gray-400 py-4">
                            <div class="text-2xl mb-2">✅</div>
                            <div>No bills due soon</div>
                        </div>
                    `}
                </div>
                ${bills.length > 0 ? `
                    <button class="w-full mt-3 p-2 text-sm text-blue-400 hover:text-blue-300 transition-colors quick-action" 
                            data-message="Show me all my upcoming bills and subscriptions">
                        View All Bills
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render stats widget
     */
    renderStatsWidget() {
        const container = document.getElementById('statsWidget');
        if (!container) return;

        const stats = {
            eventsToday: this.data.calendar.length,
            unreadEmails: this.data.emails.filter(e => e.isUnread).length,
            billsDue: this.data.bills.length,
            totalBillAmount: this.data.bills.reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0)
        };

        container.innerHTML = `
            <div class="glass-card p-4">
                <h3 class="text-lg font-semibold mb-3">📊 Quick Stats</h3>
                <div class="grid grid-cols-2 gap-3">
                    <div class="text-center p-3 rounded-lg bg-white bg-opacity-5">
                        <div class="text-2xl font-bold text-blue-400">${stats.eventsToday}</div>
                        <div class="text-xs text-gray-400">Events Today</div>
                    </div>
                    <div class="text-center p-3 rounded-lg bg-white bg-opacity-5">
                        <div class="text-2xl font-bold text-green-400">${stats.unreadEmails}</div>
                        <div class="text-xs text-gray-400">Unread Emails</div>
                    </div>
                    <div class="text-center p-3 rounded-lg bg-white bg-opacity-5">
                        <div class="text-2xl font-bold text-yellow-400">${stats.billsDue}</div>
                        <div class="text-xs text-gray-400">Bills Due</div>
                    </div>
                    <div class="text-center p-3 rounded-lg bg-white bg-opacity-5">
                        <div class="text-lg font-bold text-red-400">$${stats.totalBillAmount.toFixed(0)}</div>
                        <div class="text-xs text-gray-400">Amount Due</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 fade-in';
        notification.textContent = 'Dashboard updated';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    /**
     * Utility functions
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatEventTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Export for use in main interface
window.JarvisDashboard = JarvisDashboard;
