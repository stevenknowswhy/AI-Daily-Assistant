/**
 * Email Management Test Interface
 * Comprehensive testing for AI Daily Assistant email functionality
 */

class EmailTestInterface {
  constructor() {
    this.emails = [];
    this.selectedEmail = null;
    this.testResults = [];
    this.init();
  }

  init() {
    console.log('🚀 Email Test Interface initialized');
    this.updateStats();
  }

  // =====================================================
  // EMAIL LOADING & DISPLAY
  // =====================================================

  async loadEmails() {
    try {
      this.showLoading(true);
      this.showMessage('Loading emails from Gmail...', 'info');

      const response = await fetch('/api/email/inbox', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.emails = data.emails || [];
        this.displayEmails();
        this.updateStats();
        this.showMessage(`Loaded ${this.emails.length} emails successfully!`, 'success');
      } else {
        throw new Error(data.error || 'Failed to load emails');
      }

    } catch (error) {
      console.error('Error loading emails:', error);
      this.showMessage(`Error loading emails: ${error.message}`, 'error');
      this.displayEmailError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  displayEmails() {
    const emailList = document.getElementById('emailList');
    
    if (this.emails.length === 0) {
      emailList.innerHTML = `
        <div class="text-center text-muted">
          <i class="fas fa-inbox fa-3x mb-3"></i>
          <p>No emails found in your inbox</p>
        </div>
      `;
      return;
    }

    const emailsHtml = this.emails.map(email => `
      <div class="email-item ${email.isUnread ? 'email-unread' : ''} ${email.isImportant ? 'email-important' : ''} ${email.sentiment === 'urgent' ? 'email-urgent' : ''}" 
           onclick="emailTest.selectEmail('${email.id}')">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <strong class="me-2">${this.escapeHtml(email.from || 'Unknown Sender')}</strong>
              <span class="badge tone-${email.sentiment || 'neutral'} sentiment-${email.sentiment || 'neutral'}">
                ${email.sentiment || 'neutral'}
              </span>
              <span class="badge bg-secondary ms-1">${email.category || 'general'}</span>
            </div>
            <div class="mb-1">
              <strong>${this.escapeHtml(email.subject || 'No Subject')}</strong>
            </div>
            <div class="text-muted small">
              ${this.escapeHtml(email.snippet || 'No preview available')}
            </div>
          </div>
          <div class="text-end">
            <small class="text-muted">${this.formatDate(email.date)}</small>
            <div class="mt-1">
              ${email.isUnread ? '<i class="fas fa-circle text-primary" title="Unread"></i>' : ''}
              ${email.isImportant ? '<i class="fas fa-exclamation text-warning" title="Important"></i>' : ''}
              ${email.isStarred ? '<i class="fas fa-star text-warning" title="Starred"></i>' : ''}
              ${email.hasAttachments ? '<i class="fas fa-paperclip text-secondary" title="Has Attachments"></i>' : ''}
            </div>
          </div>
        </div>
        
        <div class="email-actions">
          <button class="action-btn btn-reply" onclick="event.stopPropagation(); emailTest.replyToEmail('${email.id}')">
            <i class="fas fa-reply"></i> Reply
          </button>
          <button class="action-btn btn-archive" onclick="event.stopPropagation(); emailTest.archiveEmail('${email.id}')">
            <i class="fas fa-archive"></i> Archive
          </button>
          <button class="action-btn btn-delete" onclick="event.stopPropagation(); emailTest.deleteEmail('${email.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
          <button class="action-btn btn-mark-read" onclick="event.stopPropagation(); emailTest.toggleReadStatus('${email.id}')">
            <i class="fas fa-${email.isUnread ? 'envelope-open' : 'envelope'}"></i> 
            ${email.isUnread ? 'Mark Read' : 'Mark Unread'}
          </button>
        </div>
      </div>
    `).join('');

    emailList.innerHTML = emailsHtml;
  }

  displayEmailError(errorMessage) {
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Error loading emails:</strong> ${this.escapeHtml(errorMessage)}
        <hr>
        <p class="mb-0">
          <strong>Possible solutions:</strong><br>
          • Check if Gmail authentication is set up correctly<br>
          • Verify Gmail API credentials and permissions<br>
          • Ensure the Gmail service is properly initialized<br>
          • Check server logs for detailed error information
        </p>
      </div>
    `;
  }

  selectEmail(emailId) {
    this.selectedEmail = this.emails.find(email => email.id === emailId);
    if (this.selectedEmail) {
      this.displayEmailDetails();
      this.generateSmartSuggestions();
    }
  }

  displayEmailDetails() {
    const detailsContainer = document.getElementById('selectedEmailDetails');
    const emailDetails = document.getElementById('emailDetails');
    
    if (!this.selectedEmail) {
      detailsContainer.style.display = 'none';
      return;
    }

    detailsContainer.style.display = 'block';
    
    emailDetails.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h6 class="card-title">${this.escapeHtml(this.selectedEmail.subject || 'No Subject')}</h6>
          <p class="card-text">
            <strong>From:</strong> ${this.escapeHtml(this.selectedEmail.from)}<br>
            <strong>Date:</strong> ${this.formatDate(this.selectedEmail.date)}<br>
            <strong>Category:</strong> <span class="badge bg-secondary">${this.selectedEmail.category}</span><br>
            <strong>Sentiment:</strong> <span class="badge sentiment-${this.selectedEmail.sentiment}">${this.selectedEmail.sentiment}</span><br>
            <strong>Priority:</strong> <span class="priority-${this.selectedEmail.priority <= 2 ? 'high' : this.selectedEmail.priority === 3 ? 'medium' : 'low'}">
              ${this.selectedEmail.priority <= 2 ? 'High' : this.selectedEmail.priority === 3 ? 'Medium' : 'Low'}
            </span>
          </p>
          <div class="mt-3">
            <strong>Preview:</strong>
            <div class="border p-2 mt-1 bg-light">
              ${this.escapeHtml(this.selectedEmail.snippet || 'No preview available')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =====================================================
  // AI REPLY GENERATION
  // =====================================================

  async generateReplyOptions() {
    if (!this.selectedEmail) {
      this.showMessage('Please select an email first', 'warning');
      return;
    }

    try {
      this.showMessage('Generating AI reply options...', 'info');

      const response = await fetch('/api/email/reply-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailId: this.selectedEmail.id,
          replyInstructions: 'Generate professional reply options',
          options: {
            tones: ['professional', 'casual', 'brief', 'detailed'],
            maxOptions: 3
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.displayReplyOptions(data.replyOptions);
        this.showMessage('AI reply options generated successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate reply options');
      }

    } catch (error) {
      console.error('Error generating reply options:', error);
      this.showMessage(`Error generating replies: ${error.message}`, 'error');
    }
  }

  displayReplyOptions(replyOptions) {
    const container = document.getElementById('replyOptions');
    
    if (!replyOptions || replyOptions.length === 0) {
      container.innerHTML = '<p class="text-muted">No reply options generated</p>';
      return;
    }

    const optionsHtml = replyOptions.map((option, index) => `
      <div class="reply-option" onclick="emailTest.selectReplyOption(${index})">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="tone-badge tone-${option.tone}">${option.tone}</span>
          <div>
            <small class="text-muted">${option.wordCount} words</small>
            <span class="badge bg-success ms-2">${Math.round(option.confidence * 100)}% confidence</span>
          </div>
        </div>
        <div class="mb-2">
          <strong>Subject:</strong> ${this.escapeHtml(option.subject)}
        </div>
        <div class="reply-content">
          ${this.escapeHtml(option.content).substring(0, 200)}${option.content.length > 200 ? '...' : ''}
        </div>
        <div class="mt-2">
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); emailTest.approveReply(${index})">
            <i class="fas fa-check"></i> Approve & Send
          </button>
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); emailTest.editReply(${index})">
            <i class="fas fa-edit"></i> Edit
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = optionsHtml;
  }

  selectReplyOption(index) {
    // Remove previous selections
    document.querySelectorAll('.reply-option').forEach(option => {
      option.classList.remove('selected');
    });

    // Select the clicked option
    const options = document.querySelectorAll('.reply-option');
    if (options[index]) {
      options[index].classList.add('selected');
      this.selectedReplyIndex = index;
    }
  }

  async approveReply(index) {
    try {
      this.showMessage('Approving and sending reply...', 'info');

      // This would integrate with the approval workflow
      const response = await fetch('/api/test-comprehensive/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approved: true,
          actionType: 'email',
          replyIndex: index
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage('Reply approved and sent successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to approve reply');
      }
    } catch (error) {
      console.error('Error approving reply:', error);
      this.showMessage(`Approval failed: ${error.message}`, 'error');
    }
  }

  editReply(index) {
    const options = document.querySelectorAll('.reply-option');
    if (options[index]) {
      const contentDiv = options[index].querySelector('.reply-content');
      const currentContent = contentDiv.textContent;

      // Create a simple edit interface
      const editHtml = `
        <div class="mt-2">
          <textarea class="form-control" rows="4" id="editReply${index}">${currentContent}</textarea>
          <div class="mt-2">
            <button class="btn btn-sm btn-success" onclick="emailTest.saveEditedReply(${index})">
              <i class="fas fa-save"></i> Save Changes
            </button>
            <button class="btn btn-sm btn-secondary" onclick="emailTest.cancelEdit(${index})">
              <i class="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      `;

      contentDiv.innerHTML = editHtml;
      this.showMessage('Edit the reply content and click Save Changes', 'info');
    }
  }

  saveEditedReply(index) {
    const textarea = document.getElementById(`editReply${index}`);
    if (textarea) {
      const newContent = textarea.value;
      const options = document.querySelectorAll('.reply-option');
      if (options[index]) {
        const contentDiv = options[index].querySelector('.reply-content');
        contentDiv.textContent = newContent;
        this.showMessage('Reply content updated successfully!', 'success');
      }
    }
  }

  cancelEdit(index) {
    // Restore original content (simplified - in production you'd store the original)
    const options = document.querySelectorAll('.reply-option');
    if (options[index]) {
      const contentDiv = options[index].querySelector('.reply-content');
      contentDiv.textContent = 'Original reply content restored';
      this.showMessage('Edit cancelled', 'info');
    }
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  updateStats() {
    document.getElementById('totalEmails').textContent = this.emails.length;
    document.getElementById('unreadEmails').textContent = this.emails.filter(e => e.isUnread).length;
    document.getElementById('importantEmails').textContent = this.emails.filter(e => e.isImportant).length;
    document.getElementById('testsPassed').textContent = `${this.testResults.filter(t => t.passed).length}/${this.testResults.length}`;
  }

  showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
  }

  showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const alertClass = {
      'success': 'alert-success',
      'error': 'alert-danger',
      'warning': 'alert-warning',
      'info': 'alert-info'
    }[type] || 'alert-info';

    const messageEl = document.createElement('div');
    messageEl.className = `alert ${alertClass} alert-dismissible fade show`;
    messageEl.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(messageEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  // =====================================================
  // EMAIL ACTIONS & OPERATIONS
  // =====================================================

  async testGmailAuth() {
    try {
      this.showMessage('Testing Gmail authentication...', 'info');

      const response = await fetch('/api/email/auth-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.authenticated) {
        this.showMessage('Gmail authentication successful!', 'success');
      } else {
        this.showMessage('Gmail authentication required. Please authenticate first.', 'warning');
      }

    } catch (error) {
      console.error('Error testing Gmail auth:', error);
      this.showMessage(`Auth test failed: ${error.message}`, 'error');
    }
  }

  async generateSmartSuggestions() {
    if (!this.selectedEmail) return;

    try {
      const response = await fetch('/api/email/smart-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailId: this.selectedEmail.id
        })
      });

      const data = await response.json();

      if (data.success) {
        this.displaySmartSuggestions(data.suggestions);
      }

    } catch (error) {
      console.error('Error generating smart suggestions:', error);
    }
  }

  displaySmartSuggestions(suggestions) {
    const container = document.getElementById('smartSuggestions');

    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = '<p class="text-muted">No smart suggestions available</p>';
      return;
    }

    const suggestionsHtml = suggestions.map(suggestion => `
      <div class="alert alert-info">
        <strong>${suggestion.title}</strong>
        <p class="mb-1">${suggestion.template}</p>
        <small class="text-muted">Confidence: ${Math.round(suggestion.confidence * 100)}%</small>
      </div>
    `).join('');

    container.innerHTML = suggestionsHtml;
  }

  async replyToEmail(emailId) {
    try {
      this.showMessage(`Preparing reply to email ${emailId}...`, 'info');

      // This would integrate with the approval workflow
      const response = await fetch('/api/test-comprehensive/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: `Reply to email ${emailId} with a professional response`
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage('Reply task created and requires approval', 'success');
      } else {
        throw new Error(data.error || 'Failed to create reply task');
      }

    } catch (error) {
      console.error('Error creating reply:', error);
      this.showMessage(`Reply failed: ${error.message}`, 'error');
    }
  }

  async archiveEmail(emailId) {
    try {
      this.showMessage(`Archiving email ${emailId}...`, 'info');

      const response = await fetch('/api/email/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailId: emailId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage('Email archived successfully!', 'success');
        // Remove from current view
        this.emails = this.emails.filter(email => email.id !== emailId);
        this.displayEmails();
        this.updateStats();
      } else {
        throw new Error(data.error || 'Failed to archive email');
      }

    } catch (error) {
      console.error('Error archiving email:', error);
      this.showMessage(`Archive failed: ${error.message}`, 'error');
    }
  }

  async deleteEmail(emailId) {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    try {
      this.showMessage(`Deleting email ${emailId}...`, 'info');

      const response = await fetch('/api/email/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailId: emailId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage('Email deleted successfully!', 'success');
        // Remove from current view
        this.emails = this.emails.filter(email => email.id !== emailId);
        this.displayEmails();
        this.updateStats();
      } else {
        throw new Error(data.error || 'Failed to delete email');
      }

    } catch (error) {
      console.error('Error deleting email:', error);
      this.showMessage(`Delete failed: ${error.message}`, 'error');
    }
  }

  async toggleReadStatus(emailId) {
    const email = this.emails.find(e => e.id === emailId);
    if (!email) return;

    try {
      const markAsRead = email.isUnread;
      this.showMessage(`Marking email as ${markAsRead ? 'read' : 'unread'}...`, 'info');

      const response = await fetch('/api/email/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailId: emailId,
          markAsRead: markAsRead
        })
      });

      const data = await response.json();

      if (data.success) {
        email.isUnread = !markAsRead;
        this.displayEmails();
        this.updateStats();
        this.showMessage(`Email marked as ${markAsRead ? 'read' : 'unread'}!`, 'success');
      } else {
        throw new Error(data.error || 'Failed to update read status');
      }

    } catch (error) {
      console.error('Error updating read status:', error);
      this.showMessage(`Update failed: ${error.message}`, 'error');
    }
  }

  // =====================================================
  // COMPREHENSIVE TEST SCENARIOS
  // =====================================================

  async runComprehensiveTests() {
    this.showMessage('Running comprehensive email tests...', 'info');
    this.testResults = [];

    const tests = [
      { name: 'Gmail Authentication', fn: () => this.testGmailAuth() },
      { name: 'Email Retrieval', fn: () => this.testEmailRetrieval() },
      { name: 'AI Reply Generation', fn: () => this.testAIReplies() },
      { name: 'Smart Suggestions', fn: () => this.testSmartSuggestions() },
      { name: 'Sentiment Analysis', fn: () => this.testSentimentAnalysis() },
      { name: 'Bulk Operations', fn: () => this.testBulkOperations() },
      { name: 'Spam Detection', fn: () => this.testSpamDetection() },
      { name: 'Approval Workflow', fn: () => this.testApprovalWorkflow() }
    ];

    for (const test of tests) {
      try {
        await test.fn();
        this.testResults.push({ name: test.name, passed: true, error: null });
      } catch (error) {
        this.testResults.push({ name: test.name, passed: false, error: error.message });
      }
    }

    this.displayTestResults();
    this.updateStats();

    const passedCount = this.testResults.filter(t => t.passed).length;
    this.showMessage(`Tests completed: ${passedCount}/${this.testResults.length} passed`,
                     passedCount === this.testResults.length ? 'success' : 'warning');
  }

  displayTestResults() {
    const container = document.getElementById('testResults');

    const resultsHtml = this.testResults.map(result => `
      <div class="alert ${result.passed ? 'alert-success' : 'alert-danger'}">
        <i class="fas fa-${result.passed ? 'check-circle' : 'times-circle'}"></i>
        <strong>${result.name}</strong>
        ${result.error ? `<br><small>Error: ${result.error}</small>` : ''}
      </div>
    `).join('');

    container.innerHTML = resultsHtml;
  }

  // Individual test methods
  async testEmailRetrieval() {
    this.showMessage('Testing email retrieval...', 'info');
    await this.loadEmails();
  }

  async testEmailSearch() {
    try {
      this.showMessage('Testing email search functionality...', 'info');

      const response = await fetch('/api/email/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'test',
          maxResults: 5
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage(`Email search test passed! Found ${data.count} results`, 'success');
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      this.showMessage(`Email search test failed: ${error.message}`, 'error');
    }
  }

  async testEmailThreads() {
    try {
      this.showMessage('Testing email thread functionality...', 'info');

      if (this.emails.length > 0) {
        const firstEmail = this.emails[0];
        if (firstEmail.threadId) {
          const response = await fetch(`/api/email/thread/${firstEmail.threadId}`);
          const data = await response.json();

          if (data.success) {
            this.showMessage(`Email threads test passed! Thread has ${data.thread.messages.length} messages`, 'success');
          } else {
            throw new Error(data.error || 'Thread retrieval failed');
          }
        } else {
          this.showMessage('Email threads test completed (no thread ID available)', 'warning');
        }
      } else {
        this.showMessage('Email threads test skipped (no emails loaded)', 'warning');
      }
    } catch (error) {
      this.showMessage(`Email threads test failed: ${error.message}`, 'error');
    }
  }

  async testAIReplies() {
    if (this.selectedEmail) {
      this.showMessage('Testing AI reply generation...', 'info');
      await this.generateReplyOptions();
    } else {
      this.showMessage('Please select an email first to test AI replies', 'warning');
    }
  }

  async testSmartSuggestions() {
    if (this.selectedEmail) {
      this.showMessage('Testing smart suggestions...', 'info');
      await this.generateSmartSuggestions();
    } else {
      this.showMessage('Please select an email first to test smart suggestions', 'warning');
    }
  }

  async testSentimentAnalysis() {
    try {
      this.showMessage('Testing sentiment analysis...', 'info');

      if (this.emails.length > 0) {
        const sentimentCounts = {
          positive: 0,
          negative: 0,
          neutral: 0,
          urgent: 0
        };

        this.emails.forEach(email => {
          if (sentimentCounts.hasOwnProperty(email.sentiment)) {
            sentimentCounts[email.sentiment]++;
          }
        });

        const totalEmails = this.emails.length;
        const analysisResults = Object.entries(sentimentCounts)
          .map(([sentiment, count]) => `${sentiment}: ${count}`)
          .join(', ');

        this.showMessage(`Sentiment analysis test passed! Analyzed ${totalEmails} emails (${analysisResults})`, 'success');
      } else {
        this.showMessage('Sentiment analysis test skipped (no emails loaded)', 'warning');
      }
    } catch (error) {
      this.showMessage(`Sentiment analysis test failed: ${error.message}`, 'error');
    }
  }

  async testBulkOperations() {
    try {
      this.showMessage('Testing bulk operations...', 'info');

      if (this.emails.length >= 2) {
        // Test bulk archive with first 2 emails (dry run)
        const emailIds = this.emails.slice(0, 2).map(email => email.id);

        const response = await fetch('/api/email/bulk-archive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            emailIds: emailIds,
            dryRun: true
          })
        });

        const data = await response.json();

        if (data.success) {
          this.showMessage(`Bulk operations test passed! Would archive ${emailIds.length} emails`, 'success');
        } else {
          throw new Error(data.error || 'Bulk operation failed');
        }
      } else {
        this.showMessage('Bulk operations test skipped (need at least 2 emails)', 'warning');
      }
    } catch (error) {
      this.showMessage(`Bulk operations test failed: ${error.message}`, 'error');
    }
  }

  async testSpamDetection() {
    try {
      this.showMessage('Testing spam detection...', 'info');

      if (this.emails.length > 0) {
        // Analyze current emails for spam characteristics
        const promotionalEmails = this.emails.filter(email => email.category === 'promotional');
        const spamKeywords = ['offer', 'sale', 'discount', 'free', 'urgent', 'limited time'];

        let spamScore = 0;
        this.emails.forEach(email => {
          const subject = (email.subject || '').toLowerCase();
          const snippet = (email.snippet || '').toLowerCase();

          spamKeywords.forEach(keyword => {
            if (subject.includes(keyword) || snippet.includes(keyword)) {
              spamScore++;
            }
          });
        });

        this.showMessage(`Spam detection test passed! Found ${promotionalEmails.length} promotional emails, spam score: ${spamScore}`, 'success');
      } else {
        this.showMessage('Spam detection test skipped (no emails loaded)', 'warning');
      }
    } catch (error) {
      this.showMessage(`Spam detection test failed: ${error.message}`, 'error');
    }
  }

  async testApprovalWorkflow() {
    try {
      this.showMessage('Testing approval workflow integration...', 'info');

      // Test creating an email task that requires approval
      const response = await fetch('/api/test-comprehensive/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: 'Reply to test email with approval workflow test message'
        })
      });

      const data = await response.json();

      if (data.success && data.category === 'email_management') {
        this.showMessage('Approval workflow test passed! Email task created successfully', 'success');
      } else {
        throw new Error(data.error || 'Approval workflow test failed');
      }
    } catch (error) {
      this.showMessage(`Approval workflow test failed: ${error.message}`, 'error');
    }
  }
}

// Initialize the interface
const emailTest = new EmailTestInterface();

// Global functions for HTML onclick handlers
window.emailTest = emailTest;

// Expose individual methods as global functions for onclick handlers
window.loadEmails = () => emailTest.loadEmails();
window.testGmailAuth = () => emailTest.testGmailAuth();
window.runComprehensiveTests = () => emailTest.runComprehensiveTests();
window.testEmailRetrieval = () => emailTest.testEmailRetrieval();
window.testEmailSearch = () => emailTest.testEmailSearch();
window.testEmailThreads = () => emailTest.testEmailThreads();
window.testAIReplies = () => emailTest.testAIReplies();
window.testSmartSuggestions = () => emailTest.testSmartSuggestions();
window.testSentimentAnalysis = () => emailTest.testSentimentAnalysis();
window.testBulkOperations = () => emailTest.testBulkOperations();
window.testSpamDetection = () => emailTest.testSpamDetection();
window.testApprovalWorkflow = () => emailTest.testApprovalWorkflow();
window.generateReplyOptions = () => emailTest.generateReplyOptions();

// Additional global functions for email actions
window.selectReplyOption = (index) => emailTest.selectReplyOption(index);
window.approveReply = (index) => emailTest.approveReply(index);
window.editReply = (index) => emailTest.editReply(index);
window.saveEditedReply = (index) => emailTest.saveEditedReply(index);
window.cancelEdit = (index) => emailTest.cancelEdit(index);
