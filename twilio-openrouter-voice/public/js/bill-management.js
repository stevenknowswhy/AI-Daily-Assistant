/**
 * Bill Management Interface JavaScript
 * ===================================
 * 
 * Handles all interactive functionality for the bill management interface
 * without inline scripts to comply with Content Security Policy (CSP)
 */

// Global state
let currentUserId = '+14158552745';

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bill Management Interface initialized');
    
    // Set default values
    initializeDefaults();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadUserBills();
});

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Add bill form submission
    const billForm = document.getElementById('billForm');
    if (billForm) {
        billForm.addEventListener('submit', handleAddBill);
    }

    // Preferences form submission
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handleSavePreferences);
    }

    // Test buttons
    const testBriefingBtn = document.getElementById('testBriefingBtn');
    if (testBriefingBtn) {
        testBriefingBtn.addEventListener('click', testDailyBriefing);
    }

    const testBillsBtn = document.getElementById('testBillsBtn');
    if (testBillsBtn) {
        testBillsBtn.addEventListener('click', testBillReminders);
    }

    const refreshBillsBtn = document.getElementById('refreshBillsBtn');
    if (refreshBillsBtn) {
        refreshBillsBtn.addEventListener('click', loadUserBills);
    }
}

/**
 * Initialize default values
 */
function initializeDefaults() {
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateInput = document.getElementById('dueDate');
    if (dueDateInput) {
        dueDateInput.value = tomorrow.toISOString().split('T')[0];
    }

    // Set default user IDs
    const userIdInputs = document.querySelectorAll('input[id$="UserId"]');
    userIdInputs.forEach(input => {
        if (input.value === '') {
            input.value = currentUserId;
        }
    });
}

/**
 * Handle add bill form submission
 */
async function handleAddBill(event) {
    event.preventDefault();
    
    const billData = {
        userId: document.getElementById('userId').value,
        name: document.getElementById('billName').value,
        amount: parseFloat(document.getElementById('amount').value) || null,
        dueDate: document.getElementById('dueDate').value,
        recurrenceType: document.getElementById('recurrenceType').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value,
        autoPay: document.getElementById('autoPay').checked
    };

    try {
        const response = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData)
        });

        const result = await response.json();
        const resultDiv = document.getElementById('addBillResult');
        
        if (response.ok) {
            showStatus('addBillResult', 'success', `✅ Bill "${billData.name}" added successfully!`);
            document.getElementById('billForm').reset();
            initializeDefaults(); // Reset defaults
            loadUserBills(); // Refresh the list
        } else {
            showStatus('addBillResult', 'error', `❌ Error: ${result.error}`);
        }
    } catch (error) {
        showStatus('addBillResult', 'error', `❌ Network error: ${error.message}`);
    }
}

/**
 * Handle save preferences form submission
 */
async function handleSavePreferences(event) {
    event.preventDefault();
    
    const preferences = {
        userId: document.getElementById('prefUserId').value,
        preferredTime: document.getElementById('preferredTime').value,
        timezone: document.getElementById('timezone').value,
        includeEmails: document.getElementById('includeEmails').checked,
        includeCalendar: document.getElementById('includeCalendar').checked,
        includeBills: document.getElementById('includeBills').checked,
        maxEmailsToMention: parseInt(document.getElementById('maxEmails').value),
        billReminderDays: parseInt(document.getElementById('billReminderDays').value)
    };

    try {
        const response = await fetch('/api/briefing-preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences)
        });

        const result = await response.json();
        
        if (response.ok) {
            showStatus('preferencesResult', 'success', '✅ Preferences saved successfully!');
        } else {
            showStatus('preferencesResult', 'error', `❌ Error: ${result.error}`);
        }
    } catch (error) {
        showStatus('preferencesResult', 'error', `❌ Network error: ${error.message}`);
    }
}

/**
 * Load user bills and display them
 */
async function loadUserBills() {
    const userId = document.getElementById('userId')?.value || currentUserId;
    
    try {
        const response = await fetch(`/api/bills/${encodeURIComponent(userId)}`);
        const bills = await response.json();
        
        const billsList = document.getElementById('billsList');
        
        if (bills.length === 0) {
            billsList.innerHTML = '<p>No bills found. Add some bills to get started!</p>';
            return;
        }
        
        billsList.innerHTML = bills.map(bill => {
            const dueDate = new Date(bill.due_date);
            const today = new Date();
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = '';
            let statusText = '';
            
            if (daysUntil < 0) {
                statusClass = 'overdue';
                statusText = `Overdue by ${Math.abs(daysUntil)} days`;
            } else if (daysUntil <= 3) {
                statusClass = 'due-soon';
                statusText = daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`;
            } else {
                statusText = `Due in ${daysUntil} days`;
            }
            
            return `
                <div class="bill-item ${statusClass}">
                    <strong>${bill.name}</strong> - $${bill.amount || 'N/A'}
                    <br>
                    <small>
                        ${statusText} (${dueDate.toLocaleDateString()}) | 
                        ${bill.category} | 
                        ${bill.recurrence_type}
                        ${bill.auto_pay ? ' | Auto-pay' : ''}
                    </small>
                    <br>
                    <button class="mark-paid-btn" data-bill-id="${bill.id}" style="margin-top: 10px; padding: 5px 10px; font-size: 12px;">
                        Mark as Paid
                    </button>
                </div>
            `;
        }).join('');
        
        // Add event listeners to mark paid buttons
        document.querySelectorAll('.mark-paid-btn').forEach(button => {
            button.addEventListener('click', function() {
                const billId = this.getAttribute('data-bill-id');
                markBillPaid(billId);
            });
        });
        
    } catch (error) {
        document.getElementById('billsList').innerHTML = `<p class="status error">Error loading bills: ${error.message}</p>`;
    }
}

/**
 * Mark a bill as paid
 */
async function markBillPaid(billId) {
    try {
        const response = await fetch(`/api/bills/${billId}/paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            showAlert('✅ Bill marked as paid and next due date calculated!');
            loadUserBills(); // Refresh the list
        } else {
            const error = await response.json();
            showAlert(`❌ Error: ${error.error}`);
        }
    } catch (error) {
        showAlert(`❌ Network error: ${error.message}`);
    }
}

/**
 * Test daily briefing generation
 */
async function testDailyBriefing() {
    const userId = document.getElementById('testUserId').value;
    const resultDiv = document.getElementById('briefingResult');
    
    showStatus('briefingResult', '', '🔄 Generating daily briefing...');
    
    try {
        const response = await fetch('/test/daily-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        const result = await response.json();
        
        if (response.ok) {
            const briefingHtml = `
                <strong>✅ Daily Briefing Generated:</strong><br><br>
                <em>"${result.briefing.response}"</em><br><br>
                <small>
                    📧 Emails: ${result.briefing.data?.emails?.length || 0} | 
                    📅 Events: ${result.briefing.data?.calendar?.length || 0} | 
                    💳 Bills: ${result.briefing.data?.bills?.length || 0}
                </small>
            `;
            showStatus('briefingResult', 'success', briefingHtml);
        } else {
            showStatus('briefingResult', 'error', `❌ Error: ${result.error}`);
        }
    } catch (error) {
        showStatus('briefingResult', 'error', `❌ Network error: ${error.message}`);
    }
}

/**
 * Test bill reminders only
 */
async function testBillReminders() {
    const userId = document.getElementById('testUserId').value;
    
    showStatus('briefingResult', '', '🔄 Checking bill reminders...');
    
    try {
        const response = await fetch(`/api/bills/${encodeURIComponent(userId)}/due-soon`);
        const bills = await response.json();
        
        if (response.ok) {
            if (bills.length === 0) {
                showStatus('briefingResult', 'success', '✅ No bills due soon!');
            } else {
                const billsHtml = `
                    <strong>💳 Bills Due Soon (${bills.length}):</strong><br><br>
                    ${bills.map(bill => `
                        • ${bill.name}: $${bill.amount} due ${bill.daysUntilDue === 0 ? 'today' : `in ${bill.daysUntilDue} days`}
                    `).join('<br>')}
                `;
                showStatus('briefingResult', 'success', billsHtml);
            }
        } else {
            showStatus('briefingResult', 'error', `❌ Error: ${bills.error}`);
        }
    } catch (error) {
        showStatus('briefingResult', 'error', `❌ Network error: ${error.message}`);
    }
}

/**
 * Show status message in a specific element
 */
function showStatus(elementId, statusClass, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = statusClass ? `status ${statusClass}` : 'status';
        element.innerHTML = message;
        element.style.display = 'block';
    }
}

/**
 * Show alert message (replacement for window.alert)
 */
function showAlert(message) {
    // Create a simple alert div
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2563eb;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-width: 400px;
    `;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    // Remove after 4 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 4000);
}

// Export functions for potential external use
window.billManagement = {
    loadUserBills,
    testDailyBriefing,
    testBillReminders,
    markBillPaid
};
