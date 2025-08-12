/**
 * Task Management Interface JavaScript
 * ===================================
 * 
 * Handles task management UI interactions and API calls
 */

class TaskManagementUI {
  constructor() {
    this.userId = '+14158552745'; // Default test user
    this.currentTab = 'pending';
    this.tasks = {
      pending: [],
      completed: [],
      emailDrafts: [],
      calendarEvents: []
    };

    this.init();
  }

  async init() {
    console.log('🚀 Initializing Task Management UI...');
    
    this.setupEventListeners();
    await this.loadInitialData();
    
    console.log('✅ Task Management UI initialized');
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Voice command processing
    const processBtn = document.getElementById('processCommandBtn');
    const voiceInput = document.getElementById('voiceCommandInput');
    
    if (processBtn) {
      processBtn.addEventListener('click', () => {
        this.processVoiceCommand();
      });
    }

    if (voiceInput) {
      voiceInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.processVoiceCommand();
        }
      });
    }
  }

  async loadInitialData() {
    try {
      console.log('📊 Loading initial task data...');
      
      // Load stats
      await this.loadTaskStats();
      
      // Load pending tasks
      await this.loadPendingTasks();
      
      // Load completed tasks
      await this.loadCompletedTasks();
      
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      this.showError('Failed to load task data');
    }
  }

  async loadTaskStats() {
    try {
      const response = await fetch(`/api/tasks/${this.userId}/summary`);
      const summary = await response.json();

      // Update stats display
      document.getElementById('pendingCount').textContent = summary.pending?.total || 0;
      document.getElementById('urgentCount').textContent = summary.pending?.urgent || 0;
      document.getElementById('completedCount').textContent = summary.recentlyCompleted?.length || 0;
      document.getElementById('emailDraftsCount').textContent = summary.pending?.byType?.email_reply || 0;

      console.log('📊 Task stats loaded:', summary);
    } catch (error) {
      console.error('❌ Error loading task stats:', error);
    }
  }

  async loadPendingTasks() {
    try {
      const response = await fetch(`/api/tasks/${this.userId}`);
      const tasks = await response.json();

      this.tasks.pending = tasks;
      this.renderPendingTasks();

      console.log('📋 Pending tasks loaded:', tasks.length);
    } catch (error) {
      console.error('❌ Error loading pending tasks:', error);
      this.showError('Failed to load pending tasks');
    }
  }

  async loadCompletedTasks() {
    try {
      const response = await fetch(`/api/tasks/${this.userId}?status=completed`);
      const tasks = await response.json();

      this.tasks.completed = tasks;
      this.renderCompletedTasks();

      console.log('✅ Completed tasks loaded:', tasks.length);
    } catch (error) {
      console.error('❌ Error loading completed tasks:', error);
      this.showError('Failed to load completed tasks');
    }
  }

  renderPendingTasks() {
    const grid = document.getElementById('pendingTasksGrid');
    
    if (this.tasks.pending.length === 0) {
      grid.innerHTML = '<div class="loading">No pending tasks</div>';
      return;
    }

    grid.innerHTML = this.tasks.pending.map(task => `
      <div class="task-card">
        <div class="task-header">
          <span class="task-type">${task.task_type.replace('_', ' ')}</span>
          <span class="task-priority priority-${task.priority}">Priority ${task.priority}</span>
        </div>
        <div class="task-title">${task.task_summary}</div>
        <div class="task-command">"${task.voice_command}"</div>
        <div class="status-badge status-${task.task_status}">${task.task_status.replace('_', ' ')}</div>
        <div class="task-actions">
          ${task.task_status === 'draft_ready' ? `
            <button class="btn btn-primary" onclick="taskUI.approveTask('${task.id}')">Approve</button>
            <button class="btn btn-secondary" onclick="taskUI.reviewTask('${task.id}')">Review</button>
          ` : ''}
          <button class="btn btn-danger" onclick="taskUI.cancelTask('${task.id}')">Cancel</button>
        </div>
      </div>
    `).join('');
  }

  renderCompletedTasks() {
    const grid = document.getElementById('completedTasksGrid');
    
    if (this.tasks.completed.length === 0) {
      grid.innerHTML = '<div class="loading">No completed tasks</div>';
      return;
    }

    grid.innerHTML = this.tasks.completed.map(task => `
      <div class="task-card">
        <div class="task-header">
          <span class="task-type">${task.task_type.replace('_', ' ')}</span>
          <span class="status-badge status-completed">Completed</span>
        </div>
        <div class="task-title">${task.completion_summary}</div>
        <div class="task-command">Completed: ${new Date(task.completion_timestamp).toLocaleString()}</div>
        ${task.voice_command ? `<div class="task-command">"${task.voice_command}"</div>` : ''}
      </div>
    `).join('');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;
    console.log('📑 Switched to tab:', tabName);
  }

  async processVoiceCommand() {
    const input = document.getElementById('voiceCommandInput');
    const voiceCommand = input.value.trim();

    if (!voiceCommand) {
      this.showError('Please enter a voice command');
      return;
    }

    try {
      console.log('🎙️ Processing voice command:', voiceCommand);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId,
          voiceCommand: voiceCommand
        })
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(`Task created: ${result.task.task_summary}`);
        input.value = '';
        
        // Reload data
        await this.loadInitialData();
      } else {
        this.showError(result.error || 'Failed to process command');
      }

    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      this.showError('Failed to process voice command');
    }
  }

  async approveTask(taskId) {
    try {
      console.log('✅ Approving task:', taskId);
      
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          completionSummary: 'Task approved and executed'
        })
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Task approved and completed!');
        await this.loadInitialData();
      } else {
        this.showError(result.error || 'Failed to approve task');
      }

    } catch (error) {
      console.error('❌ Error approving task:', error);
      this.showError('Failed to approve task');
    }
  }

  async cancelTask(taskId) {
    try {
      console.log('❌ Cancelling task:', taskId);
      
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Task cancelled');
        await this.loadInitialData();
      } else {
        this.showError(result.error || 'Failed to cancel task');
      }

    } catch (error) {
      console.error('❌ Error cancelling task:', error);
      this.showError('Failed to cancel task');
    }
  }

  reviewTask(taskId) {
    // For now, just show task details
    const task = this.tasks.pending.find(t => t.id === taskId);
    if (task) {
      alert(`Task Details:\n\nType: ${task.task_type}\nSummary: ${task.task_summary}\nCommand: "${task.voice_command}"\nStatus: ${task.task_status}`);
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
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.taskUI = new TaskManagementUI();
});
