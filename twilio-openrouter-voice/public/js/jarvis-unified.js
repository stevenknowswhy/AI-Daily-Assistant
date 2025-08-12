/**
 * JARVIS Unified Web Interface
 * ============================
 * 
 * Modern, responsive web interface for JARVIS AI Assistant
 * with voice interaction capabilities and real-time dashboard.
 */

class JarvisUnifiedInterface {
    constructor() {
        this.device = null;
        this.isConnected = false;
        this.isListening = false;
        this.conversationHistory = [];
        this.systemStatus = {
            calendar: false,
            email: false,
            bills: false,
            openrouter: false
        };
        this.dashboard = null;

        this.initializeElements();
        this.setupEventListeners();
        this.initializeSystem();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            voiceBtn: document.getElementById('voiceBtn'),
            connectBtn: document.getElementById('connectBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            conversationDisplay: document.getElementById('conversationDisplay'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            calendarStatus: document.getElementById('calendarStatus'),
            emailStatus: document.getElementById('emailStatus'),
            billsStatus: document.getElementById('billsStatus'),
            recentActivity: document.getElementById('recentActivity'),
            settingsBtn: document.getElementById('settingsBtn'),
            quickActions: document.querySelectorAll('.quick-action')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Voice button
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceCall());
        
        // Connection buttons
        this.elements.connectBtn.addEventListener('click', () => this.connectToTwilio());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnectFromTwilio());
        
        // Quick actions
        this.elements.quickActions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const message = e.target.dataset.message;
                this.sendQuickMessage(message);
            });
        });

        // Settings button
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.ctrlKey) {
                e.preventDefault();
                this.toggleVoiceCall();
            }
        });
    }

    /**
     * Initialize system and check status
     */
    async initializeSystem() {
        this.addActivity('Initializing JARVIS system...');
        
        try {
            // Check system health
            await this.checkSystemHealth();
            
            // Get Twilio token
            await this.getTwilioToken();
            
            this.updateStatus('ready', 'Ready');
            this.addActivity('System initialized successfully');

            // Initialize dashboard
            if (window.JarvisDashboard) {
                this.dashboard = new window.JarvisDashboard();
                this.addActivity('Dashboard initialized');
            }

        } catch (error) {
            console.error('System initialization failed:', error);
            this.updateStatus('error', 'Initialization Failed');
            this.addActivity('System initialization failed');
        }
    }

    /**
     * Check system health status
     */
    async checkSystemHealth() {
        try {
            const response = await fetch('/api/jarvis/health');
            const health = await response.json();
            
            // Update service status indicators
            this.updateServiceStatus('calendar', health.services?.calendar?.authenticated || false);
            this.updateServiceStatus('email', health.services?.gmail?.authenticated || false);
            this.updateServiceStatus('bills', health.services?.bills?.status === 'healthy');
            this.systemStatus.openrouter = health.services?.openrouter?.status === 'healthy';
            
            this.addActivity(`Health check: ${health.status}`);
            
        } catch (error) {
            console.error('Health check failed:', error);
            this.addActivity('Health check failed');
        }
    }

    /**
     * Get Twilio access token
     */
    async getTwilioToken() {
        try {
            const response = await fetch('/twilio/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: 'jarvis-web-user' })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.twilioToken = data.token;
            
            this.addActivity('Twilio token obtained');
            
        } catch (error) {
            console.error('Failed to get Twilio token:', error);
            throw error;
        }
    }

    /**
     * Connect to Twilio Voice
     */
    async connectToTwilio() {
        try {
            if (!this.twilioToken) {
                await this.getTwilioToken();
            }

            this.device = new Twilio.Device(this.twilioToken, {
                logLevel: 1,
                answerOnBridge: true
            });

            // Setup device event listeners
            this.device.on('ready', () => {
                this.isConnected = true;
                this.elements.connectBtn.disabled = true;
                this.elements.disconnectBtn.disabled = false;
                this.elements.voiceBtn.disabled = false;
                this.updateStatus('ready', 'Connected');
                this.addActivity('Connected to Twilio Voice');
            });

            this.device.on('error', (error) => {
                console.error('Twilio Device Error:', error);
                this.updateStatus('error', 'Connection Error');
                this.addActivity(`Connection error: ${error.message}`);
            });

            this.device.on('disconnect', () => {
                this.isConnected = false;
                this.isListening = false;
                this.elements.connectBtn.disabled = false;
                this.elements.disconnectBtn.disabled = true;
                this.elements.voiceBtn.disabled = true;
                this.elements.voiceBtn.classList.remove('active', 'listening');
                this.updateStatus('warning', 'Disconnected');
                this.addActivity('Disconnected from Twilio Voice');
            });

            this.device.on('incoming', (conn) => {
                this.handleIncomingCall(conn);
            });

            await this.device.register();
            
        } catch (error) {
            console.error('Failed to connect to Twilio:', error);
            this.updateStatus('error', 'Connection Failed');
            this.addActivity('Failed to connect to Twilio');
        }
    }

    /**
     * Disconnect from Twilio Voice
     */
    disconnectFromTwilio() {
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
    }

    /**
     * Toggle voice call
     */
    async toggleVoiceCall() {
        if (!this.isConnected) {
            this.addMessage('system', 'Please connect to Twilio Voice first.');
            return;
        }

        if (this.isListening) {
            this.endVoiceCall();
        } else {
            this.startVoiceCall();
        }
    }

    /**
     * Start voice call
     */
    async startVoiceCall() {
        try {
            this.isListening = true;
            this.elements.voiceBtn.classList.add('active', 'listening');
            this.elements.voiceBtn.innerHTML = '🔴';
            this.updateStatus('listening', 'Listening...');
            
            // Make call to JARVIS
            const params = {
                To: process.env.JARVIS_PHONE_NUMBER || '+14158552745'
            };
            
            this.currentCall = await this.device.connect(params);
            
            this.currentCall.on('accept', () => {
                this.addActivity('Voice call connected');
                this.addMessage('system', 'Connected to JARVIS. Start speaking...');
            });
            
            this.currentCall.on('disconnect', () => {
                this.endVoiceCall();
            });
            
            this.currentCall.on('error', (error) => {
                console.error('Call error:', error);
                this.addMessage('system', `Call error: ${error.message}`);
                this.endVoiceCall();
            });
            
        } catch (error) {
            console.error('Failed to start voice call:', error);
            this.addMessage('system', `Failed to start call: ${error.message}`);
            this.endVoiceCall();
        }
    }

    /**
     * End voice call
     */
    endVoiceCall() {
        this.isListening = false;
        this.elements.voiceBtn.classList.remove('active', 'listening');
        this.elements.voiceBtn.innerHTML = '🎤';
        this.updateStatus('ready', 'Ready');
        
        if (this.currentCall) {
            this.currentCall.disconnect();
            this.currentCall = null;
        }
        
        this.addActivity('Voice call ended');
    }

    /**
     * Handle incoming call (for future use)
     */
    handleIncomingCall(conn) {
        console.log('Incoming call from:', conn.parameters.From);
        // Auto-accept for JARVIS calls
        conn.accept();
    }

    /**
     * Send quick message via API
     */
    async sendQuickMessage(message) {
        this.addMessage('user', message);
        this.addActivity(`Quick action: ${message}`);
        
        try {
            this.showTypingIndicator();
            
            const response = await fetch('/api/chatterbox/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    conversationContext: this.conversationHistory.slice(-10),
                    userId: 'web-user'
                })
            });
            
            const result = await response.json();
            
            this.hideTypingIndicator();
            
            if (result.success) {
                this.addMessage('jarvis', result.text);
                this.conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: result.text }
                );
                
                if (result.toolCalls && result.toolCalls.length > 0) {
                    this.addActivity(`Used ${result.toolCalls.length} tool(s)`);
                }
            } else {
                this.addMessage('system', `Error: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.hideTypingIndicator();
            this.addMessage('system', 'Failed to send message. Please try again.');
        }
    }

    /**
     * Add message to conversation display
     */
    addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble message-${sender} fade-in`;
        messageDiv.textContent = text;
        
        this.elements.conversationDisplay.appendChild(messageDiv);
        this.elements.conversationDisplay.scrollTop = this.elements.conversationDisplay.scrollHeight;
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message-bubble message-jarvis fade-in';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `;
        
        this.elements.conversationDisplay.appendChild(typingDiv);
        this.elements.conversationDisplay.scrollTop = this.elements.conversationDisplay.scrollHeight;
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * Update system status
     */
    updateStatus(type, text) {
        this.elements.statusDot.className = `status-dot status-${type === 'ready' ? 'healthy' : type === 'listening' ? 'warning' : 'error'}`;
        this.elements.statusText.textContent = text;
    }

    /**
     * Update service status
     */
    updateServiceStatus(service, isHealthy) {
        const element = this.elements[`${service}Status`];
        if (element) {
            element.textContent = isHealthy ? 'Connected' : 'Not Connected';
            element.className = isHealthy ? 'text-green-400' : 'text-yellow-400';
        }
        this.systemStatus[service] = isHealthy;
    }

    /**
     * Add activity to recent activity panel
     */
    addActivity(text) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'flex items-center space-x-2 fade-in';
        activityDiv.innerHTML = `
            <div class="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>${text}</span>
        `;
        
        this.elements.recentActivity.insertBefore(activityDiv, this.elements.recentActivity.firstChild);
        
        // Keep only last 5 activities
        while (this.elements.recentActivity.children.length > 5) {
            this.elements.recentActivity.removeChild(this.elements.recentActivity.lastChild);
        }
    }

    /**
     * Show settings modal (placeholder)
     */
    showSettings() {
        alert('Settings panel coming soon! For now, use the quick actions or voice commands.');
    }
}

// Initialize JARVIS interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.jarvis = new JarvisUnifiedInterface();
    
    // Add welcome message
    setTimeout(() => {
        window.jarvis.addMessage('jarvis', 'Welcome to JARVIS. I\'m ready to assist you with your calendar, emails, and bills. Use the quick actions or connect for voice interaction.');
    }, 1000);
});
