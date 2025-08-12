/**
 * Comprehensive Test Interface JavaScript
 * ======================================
 * 
 * Handles comprehensive testing of AI Daily Assistant functionality
 * Tests natural language processing, LLM tool calls, and end-to-end workflows
 */

class ComprehensiveTestUI {
  constructor() {
    console.log('🚀 ComprehensiveTestInterface initialized');
    this.testResults = [];
    this.isRunning = false;

    this.init();
  }

  async init() {
    console.log('🧪 Initializing Comprehensive Test UI...');
    
    this.setupEventListeners();
    await this.loadInitialStats();
    
    console.log('✅ Comprehensive Test UI initialized');
  }

  setupEventListeners() {
    // Command input enter key
    const commandInput = document.getElementById('commandInput');
    if (commandInput) {
      commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.processCommand();
        }
      });
    }

    // Process command button
    const processCommandBtn = document.getElementById('processCommandBtn');
    if (processCommandBtn) {
      processCommandBtn.addEventListener('click', () => {
        this.processCommand();
      });
    }

    // Clear command button
    const clearCommandBtn = document.getElementById('clearCommandBtn');
    if (clearCommandBtn) {
      clearCommandBtn.addEventListener('click', () => {
        this.clearCommand();
      });
    }

    // Quick test buttons
    document.querySelectorAll('.quick-test-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const command = e.target.dataset.command;
        if (command) {
          this.setCommand(command);
        }
      });
    });

    // Test scenario buttons
    const runAllTestsBtn = document.getElementById('runAllTestsBtn');
    if (runAllTestsBtn) {
      runAllTestsBtn.addEventListener('click', () => {
        this.runAllTests();
      });
    }

    const runDailyBriefingTestsBtn = document.getElementById('runDailyBriefingTestsBtn');
    if (runDailyBriefingTestsBtn) {
      runDailyBriefingTestsBtn.addEventListener('click', () => {
        this.runDailyBriefingTests();
      });
    }

    const runEmailTestsBtn = document.getElementById('runEmailTestsBtn');
    if (runEmailTestsBtn) {
      runEmailTestsBtn.addEventListener('click', () => {
        this.runEmailTests();
      });
    }

    const runCalendarTestsBtn = document.getElementById('runCalendarTestsBtn');
    if (runCalendarTestsBtn) {
      runCalendarTestsBtn.addEventListener('click', () => {
        this.runCalendarTests();
      });
    }

    const runBillTestsBtn = document.getElementById('runBillTestsBtn');
    if (runBillTestsBtn) {
      runBillTestsBtn.addEventListener('click', () => {
        this.runBillTests();
      });
    }

    const clearResultsBtn = document.getElementById('clearResultsBtn');
    if (clearResultsBtn) {
      clearResultsBtn.addEventListener('click', () => {
        this.clearResults();
      });
    }

    // Event delegation for approval buttons (dynamically created)
    document.addEventListener('click', (e) => {
      console.log('Click detected on:', e.target, 'Classes:', e.target.classList.toString());

      // Check if clicked element or any parent has approval-btn class
      let targetElement = e.target;
      let foundApprovalBtn = false;

      // Walk up the DOM tree to find approval button
      while (targetElement && targetElement !== document) {
        if (targetElement.classList && targetElement.classList.contains('approval-btn')) {
          foundApprovalBtn = true;
          break;
        }
        targetElement = targetElement.parentElement;
      }

      if (foundApprovalBtn) {
        console.log('Approval button found:', targetElement);
        console.log('Button attributes:', {
          resultId: targetElement.dataset.resultId,
          actionType: targetElement.dataset.actionType,
          action: targetElement.dataset.action,
          classes: targetElement.classList.toString()
        });

        const resultId = targetElement.dataset.resultId;
        const actionType = targetElement.dataset.actionType;
        const action = targetElement.dataset.action;

        console.log('Processing approval action:', { resultId, actionType, action });

        if (action === 'approve') {
          this.approveAction(resultId, actionType);
        } else if (action === 'reject') {
          this.rejectAction(resultId);
        }
      }
    });
  }

  async loadInitialStats() {
    try {
      const response = await fetch('/api/test-comprehensive/stats');
      if (response.ok) {
        const stats = await response.json();
        this.updateStats(stats);
      }
    } catch (error) {
      console.log('No existing stats found, starting fresh');
      this.updateStats({
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0
      });
    }
  }

  updateStats(stats) {
    document.getElementById('totalTests').textContent = stats.total || 0;
    document.getElementById('successfulTests').textContent = stats.successful || 0;
    document.getElementById('failedTests').textContent = stats.failed || 0;
    document.getElementById('successRate').textContent = `${stats.successRate || 0}%`;
  }

  // =====================================================
  // COMMAND PROCESSING
  // =====================================================

  async processCommand() {
    const commandInput = document.getElementById('commandInput');
    const command = commandInput.value.trim();

    if (!command) {
      this.showError('Please enter a command to test');
      return;
    }

    if (this.isRunning) {
      this.showError('Test already running, please wait...');
      return;
    }

    try {
      this.isRunning = true;
      this.showLoading(true);
      
      console.log('🎙️ Processing command:', command);
      
      const response = await fetch('/api/test-comprehensive/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: command
        })
      });

      const result = await response.json();

      if (result.success !== false) {
        this.addTestResult(result);
        this.showSuccess(`Command processed: ${result.analysis?.intent || 'Task completed'}`);
        commandInput.value = '';
      } else {
        this.showError(result.error || 'Failed to process command');
      }

    } catch (error) {
      console.error('❌ Error processing command:', error);
      this.showError('Failed to process command: ' + error.message);
    } finally {
      this.isRunning = false;
      this.showLoading(false);
    }
  }

  // =====================================================
  // AUTOMATED TEST SCENARIOS
  // =====================================================

  async runAllTests() {
    if (this.isRunning) {
      this.showError('Test already running, please wait...');
      return;
    }

    try {
      this.isRunning = true;
      this.showLoading(true);
      this.clearResults();
      
      console.log('🤖 Running all test scenarios...');
      
      const response = await fetch('/api/test-comprehensive/run-scenarios', {
        method: 'POST'
      });

      const results = await response.json();

      if (results.results) {
        results.results.forEach(result => {
          this.addTestResult(result);
        });
        
        this.updateStats({
          total: results.totalTests,
          successful: results.successfulTests,
          failed: results.failedTests,
          successRate: ((results.successfulTests / results.totalTests) * 100).toFixed(1)
        });
        
        this.showSuccess(`Completed ${results.totalTests} test scenarios. ${results.successfulTests} successful, ${results.failedTests} failed.`);
      } else {
        this.showError('Failed to run test scenarios');
      }

    } catch (error) {
      console.error('❌ Error running test scenarios:', error);
      this.showError('Failed to run test scenarios: ' + error.message);
    } finally {
      this.isRunning = false;
      this.showLoading(false);
    }
  }

  async runDailyBriefingTests() {
    await this.runSpecificTests([
      "Give me my daily briefing",
      "What's happening today?",
      "Tell me about my day",
      "Daily update please"
    ], 'Daily Briefing');
  }

  async runEmailTests() {
    await this.runSpecificTests([
      "Reply to John and tell him I can meet tomorrow at 2 PM",
      "Send an email to jane@example.com about the project update",
      "Delete all emails from spam@example.com",
      "Mark the email from boss@company.com as read"
    ], 'Email Management');
  }

  async runCalendarTests() {
    await this.runSpecificTests([
      "Schedule a meeting with Sarah next Friday at 10 AM",
      "Add a dentist appointment for next Tuesday at 3 PM",
      "Schedule a team meeting for tomorrow at 2 PM and invite sarah@company.com",
      "Cancel my 3 PM meeting today"
    ], 'Calendar Management');
  }

  async runBillTests() {
    await this.runSpecificTests([
      "Add my Netflix subscription bill for $15.99 due on the 15th of each month",
      "Mark my electric bill as paid",
      "What bills are due this week?",
      "Add my car insurance bill for $89.50 due quarterly"
    ], 'Bill Management');
  }

  async runSpecificTests(commands, category) {
    if (this.isRunning) {
      this.showError('Test already running, please wait...');
      return;
    }

    try {
      this.isRunning = true;
      this.showLoading(true);
      
      console.log(`🧪 Running ${category} tests...`);
      
      let successful = 0;
      let failed = 0;

      for (const command of commands) {
        try {
          const response = await fetch('/api/test-comprehensive/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
          });

          const result = await response.json();
          this.addTestResult(result);
          
          if (result.success !== false) {
            successful++;
          } else {
            failed++;
          }

          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Test failed:', command, error);
          failed++;
        }
      }

      this.showSuccess(`${category} tests completed: ${successful} successful, ${failed} failed`);

    } catch (error) {
      console.error(`❌ Error running ${category} tests:`, error);
      this.showError(`Failed to run ${category} tests: ` + error.message);
    } finally {
      this.isRunning = false;
      this.showLoading(false);
    }
  }

  // =====================================================
  // RESULT MANAGEMENT
  // =====================================================

  addTestResult(result) {
    this.testResults.unshift(result); // Add to beginning
    this.renderResults();
    this.updateStatsFromResults();
  }

  renderResults() {
    const resultsList = document.getElementById('resultsList');
    const noResults = document.getElementById('noResults');
    
    if (this.testResults.length === 0) {
      noResults.style.display = 'block';
      resultsList.innerHTML = '';
      return;
    }

    noResults.style.display = 'none';
    
    resultsList.innerHTML = this.testResults.map(result => `
      <div class="result-card">
        <div class="result-header">
          <div class="result-command">${result.command}</div>
          <div class="result-status ${result.success ? 'status-success' : 'status-error'}">
            ${result.success ? 'Success' : 'Failed'}
          </div>
        </div>
        
        <div class="result-meta">
          <span>Category: ${result.category || 'Unknown'}</span>
          <span>Time: ${result.processingTime || 0}ms</span>
          <span>Confidence: ${result.analysis?.confidence ? (result.analysis.confidence * 100).toFixed(1) + '%' : 'N/A'}</span>
          <span>${new Date(result.timestamp).toLocaleTimeString()}</span>
        </div>
        
        ${result.analysis ? `
          <div class="result-details">
            <strong>Intent:</strong> ${result.analysis.intent}<br>
            <strong>Suggested Response:</strong> ${result.analysis.suggestedResponse || 'N/A'}
            ${result.analysis.requiresApproval ? '<br><strong>⚠️ Requires Approval</strong>' : ''}
          </div>
        ` : ''}
        
        ${result.result ? `
          <div class="result-details">
            <strong>Result:</strong> ${result.result.message || 'Completed'}
            ${result.result.type ? `<br><strong>Type:</strong> ${result.result.type}` : ''}
            ${result.result.requiresApproval ? this.renderApprovalSection(result) : ''}
          </div>
        ` : ''}
        
        ${result.error ? `
          <div class="result-details">
            <strong>Error:</strong> ${result.error}
          </div>
        ` : ''}
        
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; color: #6b7280;">View Raw Data</summary>
          <div class="json-display">${JSON.stringify(result, null, 2)}</div>
        </details>
      </div>
    `).join('');
  }

  renderApprovalSection(result) {
    if (!result.result || !result.result.requiresApproval) return '';

    let approvalContent = '';

    if (result.result.type === 'email_reply' && result.result.draftContent) {
      approvalContent = `
        <div class="approval-section">
          <h4>📧 Email Draft Requires Approval</h4>
          <div class="draft-preview">${result.result.draftContent}</div>
          <button class="btn btn-success approval-btn" data-result-id="${result.id}" data-action-type="email" data-action="approve">Approve & Send</button>
          <button class="btn btn-secondary approval-btn" data-result-id="${result.id}" data-action="reject">Reject</button>
        </div>
      `;
    } else if (result.result.type === 'calendar_event' && result.result.eventDetails) {
      approvalContent = `
        <div class="approval-section">
          <h4>📅 Calendar Event Requires Approval</h4>
          <div class="draft-preview">
Title: ${result.result.eventDetails.title}
Start: ${new Date(result.result.eventDetails.startTime).toLocaleString()}
End: ${new Date(result.result.eventDetails.endTime).toLocaleString()}
Attendees: ${result.result.eventDetails.attendees?.join(', ') || 'None'}
          </div>
          <button class="btn btn-success approval-btn" data-result-id="${result.id}" data-action-type="calendar" data-action="approve">Approve & Create</button>
          <button class="btn btn-secondary approval-btn" data-result-id="${result.id}" data-action="reject">Reject</button>
        </div>
      `;
    }

    return approvalContent;
  }

  updateStatsFromResults() {
    const total = this.testResults.length;
    const successful = this.testResults.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
    
    this.updateStats({
      total,
      successful,
      failed,
      successRate
    });
  }

  clearResults() {
    this.testResults = [];
    this.renderResults();
    this.updateStats({
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0
    });
    
    // Clear server-side results too
    fetch('/api/test-comprehensive/clear', { method: 'POST' })
      .catch(error => console.log('Could not clear server results:', error));
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  setCommand(command) {
    document.getElementById('commandInput').value = command;
  }

  clearCommand() {
    document.getElementById('commandInput').value = '';
  }

  showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'block' : 'none';
    }
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showMessage(message, type) {
    // Remove existing messages
    document.querySelectorAll('.error, .success').forEach(el => el.remove());

    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = type;
    messageEl.textContent = message;

    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageEl, mainContent.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }

  // =====================================================
  // APPROVAL ACTIONS
  // =====================================================

  async approveAction(resultId, actionType) {
    try {
      console.log('🟢 APPROVE ACTION CALLED:', { resultId, actionType });

      // Show immediate feedback
      this.showSuccess('Processing approval...');

      const requestBody = {
        resultId,
        actionType,
        approved: true
      };

      console.log('🟢 Sending approval request:', requestBody);

      const response = await fetch('/api/test-comprehensive/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🟢 Response status:', response.status);

      const result = await response.json();
      console.log('🟢 Approval response:', result);

      if (result.success) {
        this.showSuccess(`${actionType} action approved and executed!`);

        // Update the UI to show approval was processed
        try {
          const resultElement = document.querySelector(`[data-result-id="${resultId}"]`);
          console.log('🟢 Found result element:', resultElement);

          if (resultElement) {
            // Try to find the approval section in different ways
            let approvalSection = null;

            // Method 1: Look for approval section in closest test-result
            const testResult = resultElement.closest('.test-result');
            if (testResult) {
              approvalSection = testResult.querySelector('.approval-section');
            }

            // Method 2: Look for approval section as sibling or parent
            if (!approvalSection) {
              approvalSection = resultElement.closest('.approval-section');
            }

            // Method 3: Look for approval section as child
            if (!approvalSection) {
              approvalSection = resultElement.querySelector('.approval-section');
            }

            console.log('🟢 Found approval section:', approvalSection);

            if (approvalSection) {
              approvalSection.innerHTML = '<div class="alert alert-success">✅ Approved and processed!</div>';
              console.log('🟢 UI updated successfully');
            } else {
              console.log('🟡 No approval section found, but approval was successful');
            }
          } else {
            console.log('🟡 No result element found, but approval was successful');
          }
        } catch (uiError) {
          console.log('🟡 UI update failed but approval was successful:', uiError.message);
        }
      } else {
        this.showError(result.error || 'Failed to approve action');
      }
    } catch (error) {
      console.error('🔴 Error approving action:', error);
      this.showError('Failed to approve action: ' + error.message);
    }
  }

  async rejectAction(resultId) {
    try {
      console.log('🔴 REJECT ACTION CALLED:', { resultId });

      // Show immediate feedback
      this.showSuccess('Processing rejection...');

      const requestBody = {
        resultId,
        approved: false
      };

      console.log('🔴 Sending rejection request:', requestBody);

      const response = await fetch('/api/test-comprehensive/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔴 Response status:', response.status);

      const result = await response.json();
      console.log('🔴 Rejection response:', result);

      if (result.success) {
        this.showSuccess('Action rejected successfully');

        // Update the UI to show rejection was processed
        try {
          const resultElement = document.querySelector(`[data-result-id="${resultId}"]`);
          console.log('🔴 Found result element:', resultElement);

          if (resultElement) {
            // Try to find the approval section in different ways
            let approvalSection = null;

            // Method 1: Look for approval section in closest test-result
            const testResult = resultElement.closest('.test-result');
            if (testResult) {
              approvalSection = testResult.querySelector('.approval-section');
            }

            // Method 2: Look for approval section as sibling or parent
            if (!approvalSection) {
              approvalSection = resultElement.closest('.approval-section');
            }

            // Method 3: Look for approval section as child
            if (!approvalSection) {
              approvalSection = resultElement.querySelector('.approval-section');
            }

            console.log('🔴 Found approval section:', approvalSection);

            if (approvalSection) {
              approvalSection.innerHTML = '<div class="alert alert-warning">❌ Rejected</div>';
              console.log('🔴 UI updated successfully');
            } else {
              console.log('🟡 No approval section found, but rejection was successful');
            }
          } else {
            console.log('🟡 No result element found, but rejection was successful');
          }
        } catch (uiError) {
          console.log('🟡 UI update failed but rejection was successful:', uiError.message);
        }
      } else {
        this.showError(result.error || 'Failed to reject action');
      }
    } catch (error) {
      console.error('🔴 Error rejecting action:', error);
      this.showError('Failed to reject action: ' + error.message);
    }
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.testUI = new ComprehensiveTestUI();
});
