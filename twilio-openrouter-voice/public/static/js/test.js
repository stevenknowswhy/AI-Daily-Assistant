/**
 * Twilio-OpenRouter Voice Integration Test Page JavaScript
 * ========================================================
 *
 * External JavaScript file for the test dashboard to comply with CSP
 */

let logContainer;

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = { success: '#48bb78', error: '#f56565', info: '#4299e1', warning: '#ed8936' };
    const entry = document.createElement('div');
    entry.innerHTML = `<span style="color: #a0aec0">[${timestamp}]</span> <span style="color: ${colors[type]}">${message}</span>`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog() {
    logContainer.innerHTML = '';
}

function showStatus(elementId, message, isSuccess) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="status ${isSuccess ? 'status-success' : 'status-error'}">${message}</div>`;
}

async function apiCall(endpoint, options = {}) {
    try {
        log(`Making request to ${endpoint}...`);
        const response = await fetch(endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await response.json();

        // Handle different response formats
        let isSuccess = false;
        if (endpoint === '/health') {
            // Health endpoint uses "status": "healthy"
            isSuccess = data.status === 'healthy';
        } else {
            // Other endpoints use "success": true/false
            isSuccess = data.success;
        }

        if (isSuccess) {
            log(`✅ ${endpoint} - Success`, 'success');
        } else {
            // Handle error objects properly
            let errorMessage = 'Unknown error';
            if (data.error) {
                if (typeof data.error === 'object') {
                    errorMessage = data.error.message || JSON.stringify(data.error);
                } else {
                    errorMessage = data.error;
                }
            } else if (data.status) {
                errorMessage = data.status;
            }
            log(`❌ ${endpoint} - ${errorMessage}`, 'error');
        }

        // Normalize response format for consistent handling
        return {
            ...data,
            success: isSuccess
        };
    } catch (error) {
        log(`❌ ${endpoint} - ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

async function checkSystemHealth() {
    log('Checking system health...', 'info');
    const result = await apiCall('/health');
    showStatus('system-status', JSON.stringify(result, null, 2), result.success);
}

async function runAllTests() {
    log('Running all tests...', 'info');
    const result = await apiCall('/test/all');
    showStatus('system-status', JSON.stringify(result, null, 2), result.success);
}

async function testOpenRouter() {
    const result = await apiCall('/test/openrouter');
    showStatus('openrouter-status', JSON.stringify(result, null, 2), result.success);
}

async function testOpenRouterChat() {
    const result = await apiCall('/test/openrouter/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello, this is a test.' })
    });
    showStatus('openrouter-status', JSON.stringify(result, null, 2), result.success);
}

async function testCustomMessage() {
    const message = document.getElementById('chat-message').value;
    const result = await apiCall('/test/openrouter/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
    });
    showStatus('openrouter-status', JSON.stringify(result, null, 2), result.success);
}

async function testTwilio() {
    const result = await apiCall('/test/twilio');
    showStatus('twilio-status', JSON.stringify(result, null, 2), result.success);
}

async function getTwilioCalls() {
    const result = await apiCall('/twilio/calls');
    showStatus('twilio-status', JSON.stringify(result, null, 2), result.success);
}

async function makeTestCall() {
    const phoneNumber = document.getElementById('phone-number').value;
    if (!phoneNumber) {
        log('❌ Please enter a phone number', 'error');
        return;
    }

    const result = await apiCall('/test/twilio/call', {
        method: 'POST',
        body: JSON.stringify({ to: phoneNumber })
    });
    showStatus('twilio-status', JSON.stringify(result, null, 2), result.success);
}

async function checkWebhooks() {
    const result = await apiCall('/test/webhook');
    showStatus('webhook-status', JSON.stringify(result, null, 2), result.success);
}

async function testWebhookHealth() {
    const result = await apiCall('/test/webhook/health');
    showStatus('webhook-status', JSON.stringify(result, null, 2), result.success);
}

// Google Calendar Functions
async function testCalendar() {
    const result = await apiCall('/test/calendar');
    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (!result.success && result.authUrl) {
        log('🔐 Authentication required. Click "Authenticate" button.', 'warning');
    }
}

async function authenticateCalendar() {
    const result = await apiCall('/test/calendar/auth');
    if (result.success && result.authUrl) {
        log('🔗 Opening Google OAuth URL...', 'info');
        // For web redirect flow, open in same window to handle redirect
        window.location.href = result.authUrl;
        log('🔄 Redirecting to Google for authentication...', 'info');
    }
    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);
}

async function submitAuthCode() {
    const code = document.getElementById('auth-code').value;
    if (!code) {
        log('❌ Please enter the OAuth code', 'error');
        return;
    }

    const result = await apiCall('/test/calendar/callback', {
        method: 'POST',
        body: JSON.stringify({ code })
    });

    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success) {
        document.getElementById('auth-code').value = '';
        log('✅ Authentication successful! You can now use calendar features.', 'success');
    }
}

async function listEvents() {
    const result = await apiCall('/test/calendar/events?maxResults=10&today=true');
    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success && result.events) {
        displayEvents(result.events, result.filterType);
    }
}

async function listAllEvents() {
    const result = await apiCall('/test/calendar/events?maxResults=20');
    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success && result.events) {
        displayEvents(result.events, 'upcoming');
    }
}

function displayEvents(events, filterType = null) {
    const eventsContainer = document.getElementById('events-container');
    const eventsList = document.getElementById('events-list');

    // Update the header to show filter information
    const eventsHeader = eventsList.querySelector('h4');
    if (eventsHeader) {
        eventsHeader.textContent = filterType === 'today' ? "Today's Events" : "Upcoming Events";
    }

    if (events.length === 0) {
        const noEventsMessage = filterType === 'today' ?
            '<p>No events scheduled for today.</p>' :
            '<p>No upcoming events found.</p>';
        eventsContainer.innerHTML = noEventsMessage;
    } else {
        eventsContainer.innerHTML = events.map(event => {
            const startTime = event.start?.dateTime || event.start?.date || 'No time';
            const endTime = event.end?.dateTime || event.end?.date || 'No time';

            return `
                <div class="event-item" style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <h5>${event.summary || 'No title'}</h5>
                    <p><strong>Start:</strong> ${new Date(startTime).toLocaleString()}</p>
                    <p><strong>End:</strong> ${new Date(endTime).toLocaleString()}</p>
                    ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                    <div>
                        <button class="btn btn-sm btn-warning edit-event-btn" data-event-id="${event.id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-event-btn" data-event-id="${event.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to the newly created buttons
        attachEventButtonListeners();
    }

    eventsList.style.display = 'block';
}

function attachEventButtonListeners() {
    // Remove existing listeners to prevent duplicates
    const editButtons = document.querySelectorAll('.edit-event-btn');
    const deleteButtons = document.querySelectorAll('.delete-event-btn');

    // Add event listeners to edit buttons
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const eventId = this.getAttribute('data-event-id');
            if (eventId) {
                editEvent(eventId);
            }
        });
    });

    // Add event listeners to delete buttons
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const eventId = this.getAttribute('data-event-id');
            if (eventId) {
                deleteEvent(eventId);
            }
        });
    });
}

function showCreateEventForm() {
    const form = document.getElementById('create-event-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';

    // Set default times (now + 1 hour to now + 2 hours)
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    document.getElementById('event-start').value = startTime.toISOString().slice(0, 16);
    document.getElementById('event-end').value = endTime.toISOString().slice(0, 16);
}

function hideCreateEventForm() {
    document.getElementById('create-event-form').style.display = 'none';
    // Clear form
    document.getElementById('event-title').value = '';
    document.getElementById('event-description').value = '';
    document.getElementById('event-start').value = '';
    document.getElementById('event-end').value = '';
}

async function submitCreateEvent() {
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const startDateTime = document.getElementById('event-start').value;
    const endDateTime = document.getElementById('event-end').value;

    if (!title || !startDateTime || !endDateTime) {
        log('❌ Please fill in title, start time, and end time', 'error');
        return;
    }

    const eventData = {
        title: title,
        description: description,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const result = await apiCall('/test/calendar/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
    });

    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success) {
        hideCreateEventForm();
        log('✅ Event created successfully!', 'success');
        // Refresh events list
        listEvents();
    }
}

async function editEvent(eventId) {
    try {
        log(`📝 Loading event details for editing: ${eventId}`, 'info');

        // Fetch event details
        const result = await apiCall(`/test/calendar/events/${eventId}`);

        if (result.success && result.event) {
            showEditEventForm(result.event);
        } else {
            log('❌ Failed to load event details for editing', 'error');
        }
    } catch (error) {
        log(`❌ Error loading event for editing: ${error.message}`, 'error');
    }
}

function showEditEventForm(event) {
    const form = document.getElementById('edit-event-form');

    // Populate form with event data
    document.getElementById('edit-event-id').value = event.id;
    document.getElementById('edit-event-title').value = event.summary || '';
    document.getElementById('edit-event-description').value = event.description || '';

    // Handle date/time formatting
    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;

    if (startTime) {
        const startDate = new Date(startTime);
        document.getElementById('edit-event-start').value = startDate.toISOString().slice(0, 16);
    }

    if (endTime) {
        const endDate = new Date(endTime);
        document.getElementById('edit-event-end').value = endDate.toISOString().slice(0, 16);
    }

    // Show the form
    form.style.display = 'block';

    // Hide create form if it's open
    const createForm = document.getElementById('create-event-form');
    if (createForm) {
        createForm.style.display = 'none';
    }

    log(`📝 Edit form opened for event: ${event.summary}`, 'info');
}

function hideEditEventForm() {
    document.getElementById('edit-event-form').style.display = 'none';
    // Clear form
    document.getElementById('edit-event-id').value = '';
    document.getElementById('edit-event-title').value = '';
    document.getElementById('edit-event-description').value = '';
    document.getElementById('edit-event-start').value = '';
    document.getElementById('edit-event-end').value = '';
}

async function submitEditEvent() {
    const eventId = document.getElementById('edit-event-id').value;
    const title = document.getElementById('edit-event-title').value;
    const description = document.getElementById('edit-event-description').value;
    const startDateTime = document.getElementById('edit-event-start').value;
    const endDateTime = document.getElementById('edit-event-end').value;

    if (!eventId || !title || !startDateTime || !endDateTime) {
        log('❌ Please fill in all required fields (title, start time, end time)', 'error');
        return;
    }

    const eventData = {
        summary: title,
        description: description,
        start: {
            dateTime: new Date(startDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: new Date(endDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };

    const result = await apiCall(`/test/calendar/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(eventData)
    });

    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success) {
        hideEditEventForm();
        log('✅ Event updated successfully!', 'success');
        // Refresh events list
        listEvents();
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    const result = await apiCall(`/test/calendar/events/${eventId}`, {
        method: 'DELETE'
    });

    showStatus('calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success) {
        log('✅ Event deleted successfully!', 'success');
        // Refresh events list
        listEvents();
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // System Status
    document.getElementById('check-health-btn').addEventListener('click', checkSystemHealth);
    document.getElementById('run-all-tests-btn').addEventListener('click', runAllTests);

    // OpenRouter Tests
    document.getElementById('test-openrouter-btn').addEventListener('click', testOpenRouter);
    document.getElementById('test-openrouter-chat-btn').addEventListener('click', testOpenRouterChat);
    document.getElementById('test-custom-message-btn').addEventListener('click', testCustomMessage);

    // Twilio Tests
    document.getElementById('test-twilio-btn').addEventListener('click', testTwilio);
    document.getElementById('get-twilio-calls-btn').addEventListener('click', getTwilioCalls);
    document.getElementById('make-test-call-btn').addEventListener('click', makeTestCall);

    // Webhook Tests
    document.getElementById('check-webhooks-btn').addEventListener('click', checkWebhooks);
    document.getElementById('test-webhook-health-btn').addEventListener('click', testWebhookHealth);

    // Google Calendar Tests
    document.getElementById('test-calendar-btn').addEventListener('click', testCalendar);
    document.getElementById('calendar-auth-btn').addEventListener('click', authenticateCalendar);
    document.getElementById('submit-auth-code-btn').addEventListener('click', submitAuthCode);
    document.getElementById('list-events-btn').addEventListener('click', listEvents);
    document.getElementById('list-all-events-btn').addEventListener('click', listAllEvents);
    document.getElementById('create-event-btn').addEventListener('click', showCreateEventForm);
    document.getElementById('submit-create-event-btn').addEventListener('click', submitCreateEvent);
    document.getElementById('cancel-create-event-btn').addEventListener('click', hideCreateEventForm);
    document.getElementById('submit-edit-event-btn').addEventListener('click', submitEditEvent);
    document.getElementById('cancel-edit-event-btn').addEventListener('click', hideEditEventForm);

    // Voice Calendar Tests
    document.getElementById('test-voice-command-btn').addEventListener('click', testCustomVoiceCommand);

    // Add event listeners to voice test buttons
    document.querySelectorAll('.voice-test-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const command = this.getAttribute('data-command');
            if (command) {
                testVoiceCommand(command);
            }
        });
    });

    // Gmail Tests
    document.getElementById('test-gmail-btn').addEventListener('click', testGmail);
    document.getElementById('gmail-auth-btn').addEventListener('click', authenticateGmail);
    document.getElementById('submit-gmail-auth-code-btn').addEventListener('click', submitGmailAuthCode);
    document.getElementById('list-messages-btn').addEventListener('click', listMessages);
    document.getElementById('list-unread-btn').addEventListener('click', listUnreadMessages);
    document.getElementById('list-important-btn').addEventListener('click', listImportantMessages);

    // Voice Gmail Tests
    document.getElementById('test-gmail-voice-command-btn').addEventListener('click', testCustomGmailVoiceCommand);

    // Add event listeners to Gmail voice test buttons
    document.querySelectorAll('.gmail-voice-test-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const command = this.getAttribute('data-command');
            if (command) {
                testGmailVoiceCommand(command);
            }
        });
    });

    // Voice Daily Summary Tests
    document.getElementById('test-daily-summary-voice-command-btn').addEventListener('click', testCustomDailySummaryVoiceCommand);

    // Add event listeners to Daily Summary voice test buttons
    document.querySelectorAll('.daily-summary-voice-test-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const command = this.getAttribute('data-command');
            if (command) {
                testDailySummaryVoiceCommand(command);
            }
        });
    });

    // Activity Log
    document.getElementById('clear-log-btn').addEventListener('click', clearLog);
}

// Voice Calendar Command Functions
async function testVoiceCommand(command) {
    log(`🎤 Testing voice command: "${command}"`, 'info');

    const result = await apiCall('/test/calendar/voice', {
        method: 'POST',
        body: JSON.stringify({ message: command })
    });

    showStatus('voice-calendar-status', JSON.stringify(result, null, 2), result.success);

    if (result.success && result.calendarResult) {
        const calResult = result.calendarResult;
        if (calResult.success) {
            log(`✅ Voice command processed: ${calResult.response}`, 'success');
        } else {
            log(`⚠️ Voice command handled: ${calResult.response}`, 'warning');
        }
    }
}

async function testCustomVoiceCommand() {
    const command = document.getElementById('voice-command-input').value;
    if (!command.trim()) {
        log('❌ Please enter a voice command to test', 'error');
        return;
    }

    await testVoiceCommand(command);

    // Clear the input
    document.getElementById('voice-command-input').value = '';
}

// ===== GMAIL FUNCTIONS =====

async function testGmail() {
    try {
        log('Testing Gmail connection...');
        const response = await apiCall('/test/gmail');
        if (response.authenticated) {
            log(`✅ Gmail connected: ${response.emailAddress}`);
            showStatus('gmail-status', `✅ Gmail connected: ${response.emailAddress} (${response.messagesTotal} messages)`, true);
        } else {
            log(`❌ Gmail not authenticated`);
            showStatus('gmail-status', '❌ Gmail not authenticated', false);
        }
    } catch (error) {
        log(`❌ Gmail test failed: ${error.message}`);
        showStatus('gmail-status', `❌ Gmail test failed: ${error.message}`, false);
    }
}

async function authenticateGmail() {
    try {
        log('Getting Gmail authentication URL...');
        const response = await apiCall('/test/gmail/auth');
        if (response.authUrl) {
            log('✅ Gmail auth URL generated');
            showStatus('gmail-status', '✅ Gmail auth URL generated - redirecting to Google', true);
            // For web redirect flow, redirect in same window
            window.location.href = response.authUrl.authUrl;
        } else {
            log('❌ Failed to get Gmail auth URL');
            showStatus('gmail-status', '❌ Failed to get Gmail auth URL', false);
        }
    } catch (error) {
        log(`❌ Gmail auth failed: ${error.message}`);
        showStatus('gmail-status', `❌ Gmail auth failed: ${error.message}`, false);
    }
}

async function submitGmailAuthCode() {
    try {
        const code = document.getElementById('gmail-auth-code').value.trim();
        if (!code) {
            showStatus('gmail-status', '❌ Please enter the authorization code', false);
            return;
        }

        log('Submitting Gmail auth code...');
        const response = await apiCall('/test/gmail/auth/callback', {
            method: 'POST',
            body: JSON.stringify({ code })
        });

        if (response.success) {
            log('✅ Gmail authentication successful');
            showStatus('gmail-status', '✅ Gmail authentication successful', true);
            document.getElementById('gmail-auth-code').value = '';
            // Test connection after auth
            setTimeout(testGmail, 1000);
        } else {
            log(`❌ Gmail auth failed: ${response.error}`);
            showStatus('gmail-status', `❌ Gmail auth failed: ${response.error}`, false);
        }
    } catch (error) {
        log(`❌ Gmail auth failed: ${error.message}`);
        showStatus('gmail-status', `❌ Gmail auth failed: ${error.message}`, false);
    }
}

async function listMessages() {
    try {
        log('Listing recent Gmail messages...');
        const response = await apiCall('/test/gmail/messages?maxResults=5&query=newer_than:1d');

        if (response.success) {
            log(`✅ Retrieved ${response.count} messages`);
            if (response.count === 0) {
                showStatus('gmail-status', '✅ No recent messages found', true);
            } else {
                const messageList = response.messages.map(msg =>
                    `"${msg.subject}" from ${extractSenderName(msg.from)} (${msg.isUnread ? 'unread' : 'read'})`
                ).join(', ');
                showStatus('gmail-status', `✅ Recent messages: ${messageList}`, true);
            }
        } else {
            log(`❌ Failed to list messages: ${response.error}`);
            showStatus('gmail-status', `❌ Failed to list messages: ${response.error}`, false);
        }
    } catch (error) {
        log(`❌ Failed to list messages: ${error.message}`);
        showStatus('gmail-status', `❌ Failed to list messages: ${error.message}`, false);
    }
}

async function listUnreadMessages() {
    try {
        log('Listing unread Gmail messages...');
        const response = await apiCall('/test/gmail/messages?maxResults=5&query=is:unread');

        if (response.success) {
            log(`✅ Retrieved ${response.count} unread messages`);
            if (response.count === 0) {
                showStatus('gmail-status', '✅ No unread messages - inbox is clear!', true);
            } else {
                const messageList = response.messages.map(msg =>
                    `"${msg.subject}" from ${extractSenderName(msg.from)}`
                ).join(', ');
                showStatus('gmail-status', `✅ Unread messages: ${messageList}`, true);
            }
        } else {
            log(`❌ Failed to list unread messages: ${response.error}`);
            showStatus('gmail-status', `❌ Failed to list unread messages: ${response.error}`, false);
        }
    } catch (error) {
        log(`❌ Failed to list unread messages: ${error.message}`);
        showStatus('gmail-status', `❌ Failed to list unread messages: ${error.message}`, false);
    }
}

async function listImportantMessages() {
    try {
        log('Listing important Gmail messages...');
        const response = await apiCall('/test/gmail/messages?maxResults=5&query=is:important OR is:starred');

        if (response.success) {
            log(`✅ Retrieved ${response.count} important messages`);
            if (response.count === 0) {
                showStatus('gmail-status', '✅ No important messages found', true);
            } else {
                const messageList = response.messages.map(msg =>
                    `"${msg.subject}" from ${extractSenderName(msg.from)}`
                ).join(', ');
                showStatus('gmail-status', `✅ Important messages: ${messageList}`, true);
            }
        } else {
            log(`❌ Failed to list important messages: ${response.error}`);
            showStatus('gmail-status', `❌ Failed to list important messages: ${response.error}`, false);
        }
    } catch (error) {
        log(`❌ Failed to list important messages: ${error.message}`);
        showStatus('gmail-status', `❌ Failed to list important messages: ${error.message}`, false);
    }
}

async function testGmailVoiceCommand(command) {
    try {
        log(`🎤 Testing Gmail voice command: "${command}"`);
        const response = await apiCall('/test/gmail/voice', {
            method: 'POST',
            body: JSON.stringify({ message: command })
        });

        if (response.gmailResult) {
            log(`✅ Gmail voice command processed: ${response.gmailResult.response}`);
            showStatus('voice-gmail-status', `✅ Gmail voice command processed: ${response.gmailResult.response}`, true);
        } else {
            log(`⚠️ Gmail voice command handled: ${response.message || 'No specific result'}`);
            showStatus('voice-gmail-status', `⚠️ Gmail voice command handled: ${response.message || 'No specific result'}`, true);
        }
    } catch (error) {
        log(`❌ Gmail voice command failed: ${error.message}`);
        showStatus('voice-gmail-status', `❌ Gmail voice command failed: ${error.message}`, false);
    }
}

async function testCustomGmailVoiceCommand() {
    try {
        const command = document.getElementById('gmail-voice-command-input').value.trim();
        if (!command) {
            showStatus('voice-gmail-status', '❌ Please enter a Gmail voice command', false);
            return;
        }

        await testGmailVoiceCommand(command);

        // Clear the input
        document.getElementById('gmail-voice-command-input').value = '';
    } catch (error) {
        log(`❌ Custom Gmail voice command failed: ${error.message}`);
        showStatus('voice-gmail-status', `❌ Custom Gmail voice command failed: ${error.message}`, false);
    }
}

// Daily Summary Voice Command Functions
async function testDailySummaryVoiceCommand(command) {
    try {
        log(`🌅 Testing daily summary voice command: "${command}"`, 'info');
        showStatus('voice-daily-summary-status', '🔄 Processing daily summary voice command...', true);

        const result = await apiCall('/test/daily-summary/voice', {
            method: 'POST',
            body: JSON.stringify({ message: command })
        });

        if (result.success && result.dailySummaryResult) {
            const summaryResult = result.dailySummaryResult;

            if (summaryResult.success) {
                log(`✅ Daily summary voice command processed: ${summaryResult.response}`);

                let statusMessage = `✅ Daily summary voice command processed:\n\n${summaryResult.response}`;

                // Add additional info if available
                if (summaryResult.data) {
                    const data = summaryResult.data;
                    let dataInfo = '\n\n📊 Data Summary:';

                    if (data.calendar && data.calendar.events) {
                        dataInfo += `\n📅 Calendar: ${data.calendar.events.length} events`;
                    }
                    if (data.gmail && data.gmail.messages) {
                        dataInfo += `\n📧 Gmail: ${data.gmail.messages.length} messages`;
                    }
                    if (data.bills && data.bills.length > 0) {
                        dataInfo += `\n💰 Bills: ${data.bills.length} items`;
                    }

                    statusMessage += dataInfo;
                }

                showStatus('voice-daily-summary-status', statusMessage, true);
            } else {
                log(`❌ Daily summary voice command failed: ${summaryResult.response || summaryResult.error}`);
                showStatus('voice-daily-summary-status', `❌ ${summaryResult.response || summaryResult.error}`, false);
            }
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        log(`❌ Daily summary voice command failed: ${error.message}`);
        showStatus('voice-daily-summary-status', `❌ Daily summary voice command failed: ${error.message}`, false);
    }
}

async function testCustomDailySummaryVoiceCommand() {
    try {
        const command = document.getElementById('daily-summary-voice-command-input').value.trim();
        if (!command) {
            showStatus('voice-daily-summary-status', '❌ Please enter a daily summary voice command', false);
            return;
        }

        await testDailySummaryVoiceCommand(command);

        // Clear the input
        document.getElementById('daily-summary-voice-command-input').value = '';
    } catch (error) {
        log(`❌ Custom daily summary voice command failed: ${error.message}`);
        showStatus('voice-daily-summary-status', `❌ Custom daily summary voice command failed: ${error.message}`, false);
    }
}

// Helper function to extract sender name
function extractSenderName(fromField) {
    if (!fromField) return 'Unknown sender';

    // Extract name from "Name <email@domain.com>" format
    const nameMatch = fromField.match(/^([^<]+)<.*>$/);
    if (nameMatch) {
        return nameMatch[1].trim().replace(/"/g, '');
    }

    // Extract name from email address
    const emailMatch = fromField.match(/([^@]+)@/);
    if (emailMatch) {
        return emailMatch[1].replace(/[._]/g, ' ');
    }

    return fromField;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    logContainer = document.getElementById('activity-log');
    initializeEventListeners();
    log('🚀 Voice Integration Test Page Loaded', 'success');
    log('📞 Phone Number: +14158552745', 'info');
    log('🔗 Webhook Base: Check configuration', 'warning');
});