/**
 * JARVIS Voice Client
 * ===================
 * 
 * Browser-based voice client using Twilio Voice SDK
 * Connects to JARVIS AI assistant through Twilio Programmable Voice
 */

// Global variables
let device = null;
let currentConnection = null;
let isConnected = false;

// UI Elements
let statusDot, statusText, connectBtn, disconnectBtn, micButton, logOutput;

/**
 * Initialize the voice client when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    addLog('JARVIS Voice Client loaded', 'info');

    // Check if Twilio SDK is already loaded
    if (isTwilioLoaded()) {
        addLog('Twilio SDK ready', 'success');
    } else {
        addLog('Waiting for Twilio SDK to load...', 'warning');
    }

    addLog('Click "Connect to JARVIS" to initialize voice connection', 'info');
});

/**
 * Initialize UI elements and event listeners
 */
function initializeUI() {
    // Get UI elements
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    connectBtn = document.getElementById('connectBtn');
    disconnectBtn = document.getElementById('disconnectBtn');
    micButton = document.getElementById('micButton');
    logOutput = document.getElementById('logOutput');

    // Add event listeners
    connectBtn.addEventListener('click', initializeDevice);
    disconnectBtn.addEventListener('click', disconnectDevice);
    micButton.addEventListener('click', toggleCall);

    addLog('UI initialized successfully', 'info');
}

/**
 * Get access token from server
 */
async function getAccessToken() {
    try {
        addLog('Requesting access token from server...', 'info');
        
        const response = await fetch('/twilio/token');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to get access token');
        }
        
        addLog('Access token received successfully', 'success');
        return data.token;
        
    } catch (error) {
        addLog(`Failed to get access token: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Check if Twilio SDK is loaded
 */
function isTwilioLoaded() {
    return typeof window.Twilio !== 'undefined' && window.Twilio.Device;
}

/**
 * Check if device is in a functional state (ready or registered)
 */
function isDeviceFunctional() {
    return device && (device.state === 'ready' || device.state === 'registered');
}

/**
 * Wait for Twilio SDK to load
 */
function waitForTwilio(maxAttempts = 10, interval = 500) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const checkTwilio = () => {
            attempts++;

            if (isTwilioLoaded()) {
                addLog('Twilio SDK detected and ready', 'success');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Twilio SDK failed to load after multiple attempts'));
            } else {
                addLog(`Waiting for Twilio SDK... (attempt ${attempts}/${maxAttempts})`, 'info');
                setTimeout(checkTwilio, interval);
            }
        };

        checkTwilio();
    });
}

/**
 * Check browser compatibility and permissions
 */
async function checkBrowserCompatibility() {
    addLog('Checking browser compatibility...', 'info');

    // Check for HTTPS (required for microphone access)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('HTTPS is required for microphone access (except on localhost)');
    }

    // Check for WebRTC support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC/getUserMedia not supported in this browser');
    }

    // Check microphone permissions
    try {
        addLog('Requesting microphone permissions...', 'info');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        addLog('Microphone access granted', 'success');

        // Stop the stream immediately as we just needed to check permissions
        stream.getTracks().forEach(track => track.stop());

        return true;
    } catch (error) {
        if (error.name === 'NotAllowedError') {
            throw new Error('Microphone access denied. Please grant microphone permissions and try again.');
        } else if (error.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
            throw new Error(`Microphone access error: ${error.message}`);
        }
    }
}

/**
 * Initialize Twilio Device
 */
async function initializeDevice() {
    try {
        updateStatus('connecting', 'Connecting...');
        connectBtn.disabled = true;

        addLog('Initializing Twilio Device...', 'info');

        // Check browser compatibility first
        await checkBrowserCompatibility();

        // Wait for Twilio SDK to be available
        if (!isTwilioLoaded()) {
            addLog('Twilio SDK not ready, waiting...', 'warning');
            await waitForTwilio();
        }

        // Get access token
        const token = await getAccessToken();

        // Initialize Twilio Device
        addLog('Creating Twilio Device with token...', 'info');
        device = new Twilio.Device(token, {
            codecPreferences: ['opus', 'pcmu'],
            fakeLocalDTMF: true,
            enableRingingState: true,
            allowIncomingWhileBusy: false,
            debug: true, // Enable debug logging
            sounds: {
                disconnect: false,
                incoming: false,
                outgoing: false
            }
        });

        // Set up device event listeners
        setupDeviceEventListeners();

        addLog('Twilio Device created, attempting registration...', 'info');

        // Check if device has register method and call it
        if (typeof device.register === 'function') {
            addLog('Calling device.register()...', 'info');
            try {
                await device.register();
                addLog('Device registration initiated', 'success');
            } catch (error) {
                addLog(`Device registration failed: ${error.message}`, 'error');
            }
        } else {
            addLog('Device.register() method not available, checking for auto-registration...', 'info');
        }

        // Set a shorter timeout since registered state is functional
        const readyTimeout = setTimeout(() => {
            if (device && device.state !== 'ready') {
                addLog('Checking device state after timeout...', 'info');
                addLog(`Current device state: ${device.state || 'unknown'}`, 'info');
                addLog(`Device identity: ${device.identity || 'unknown'}`, 'info');

                // For SDK v2.15+, registered state is fully functional
                if (device.state === 'registered') {
                    addLog('Device is registered - enabling full functionality', 'success');
                    updateStatus('ready', 'Ready');
                    connectBtn.disabled = false;
                    disconnectBtn.disabled = false;
                    micButton.disabled = false;
                    addLog('JARVIS is ready for voice interaction!', 'success');
                } else if (device.state === 'registering') {
                    addLog('Device still registering - extending timeout', 'warning');
                    // Extend timeout for slow connections
                    setTimeout(() => {
                        if (device && device.state === 'registered') {
                            addLog('Device registered after extended wait', 'success');
                            updateStatus('ready', 'Ready');
                            connectBtn.disabled = false;
                            disconnectBtn.disabled = false;
                            micButton.disabled = false;
                        }
                    }, 10000);
                } else {
                    addLog('Device failed to register properly', 'error');
                    addLog('Try refreshing the page or checking your internet connection', 'error');
                    updateStatus('disconnected', 'Registration Failed');
                    connectBtn.disabled = false;
                }
            }
        }, 8000); // Shorter 8 second timeout since registered is functional

        // Clear timeout when device becomes ready
        device.on('ready', () => {
            clearTimeout(readyTimeout);
        });

        // Handle registered state as ready for SDK v2.15+
        device.on('registered', () => {
            // Clear the timeout immediately since registered is the functional state
            clearTimeout(readyTimeout);

            // Enable functionality immediately when registered
            addLog('Device registered - enabling voice functionality', 'success');
            updateStatus('ready', 'Ready');
            connectBtn.disabled = false;
            disconnectBtn.disabled = false;
            micButton.disabled = false;

            // Also fire a custom ready event for consistency
            addLog('JARVIS is ready for voice interaction!', 'success');
        });

    } catch (error) {
        addLog(`Failed to initialize device: ${error.message}`, 'error');
        updateStatus('disconnected', 'Connection Failed');
        connectBtn.disabled = false;
    }
}

/**
 * Set up Twilio Device event listeners
 */
function setupDeviceEventListeners() {
    addLog('Setting up device event listeners...', 'info');

    device.on('ready', () => {
        addLog('Device ready for calls', 'success');
        updateStatus('ready', 'Ready');
        connectBtn.disabled = false;
        disconnectBtn.disabled = false;
        micButton.disabled = false;
    });

    device.on('error', (error) => {
        addLog(`Device error: ${error.message}`, 'error');
        addLog(`Error code: ${error.code || 'unknown'}`, 'error');
        updateStatus('disconnected', 'Error');
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        micButton.disabled = true;
    });

    device.on('registered', () => {
        addLog('Device registered successfully', 'success');
        addLog(`Device identity: ${device.identity || 'unknown'}`, 'info');
        addLog(`Device state: ${device.state || 'unknown'}`, 'info');
        addLog('Note: In SDK v2.15+, "registered" state is fully functional', 'info');
    });

    device.on('unregistered', () => {
        addLog('Device unregistered', 'info');
        addLog(`Device state: ${device.state || 'unknown'}`, 'info');
    });

    device.on('registering', () => {
        addLog('Device registering...', 'info');
        updateStatus('connecting', 'Registering...');
    });

    device.on('tokenWillExpire', () => {
        addLog('Token will expire soon', 'warning');
    });

    device.on('connect', (connection) => {
        addLog('Call connected successfully', 'success');
        currentConnection = connection;
        isConnected = true;
        updateStatus('connected', 'In Call');
        micButton.textContent = '📞';
        micButton.title = 'Hang up call';

        // Set up connection event listeners
        setupConnectionEventListeners(connection);
    });

    device.on('disconnect', () => {
        addLog('Call disconnected', 'info');
        currentConnection = null;
        isConnected = false;
        updateStatus('ready', 'Ready');
        micButton.textContent = '🎤';
        micButton.title = 'Start call';
    });

    device.on('incoming', (connection) => {
        addLog('Incoming call received', 'info');
        // For now, we'll auto-accept incoming calls
        connection.accept();
    });

    addLog('Device event listeners configured', 'info');
}

/**
 * Set up connection event listeners
 */
function setupConnectionEventListeners(connection) {
    connection.on('disconnect', () => {
        addLog('Connection ended', 'info');
        currentConnection = null;
        isConnected = false;
        updateStatus('ready', 'Ready');
        micButton.textContent = '🎤';
        micButton.title = 'Start call';
    });
    
    connection.on('error', (error) => {
        addLog(`Connection error: ${error.message}`, 'error');
    });
    
    connection.on('warning', (name, data) => {
        addLog(`Connection warning: ${name}`, 'warning');
    });
}

/**
 * Toggle call state (start/end call)
 */
function toggleCall() {
    if (isConnected && currentConnection) {
        // End current call
        endCall();
    } else {
        // Start new call
        startCall();
    }
}

/**
 * Start a new call
 */
function startCall() {
    try {
        if (!isDeviceFunctional()) {
            addLog('Device not ready. Please connect first.', 'error');
            return;
        }

        addLog('Starting call to JARVIS...', 'info');
        updateStatus('connecting', 'Calling...');

        // Make the call - this will connect to our webhook endpoint
        const connection = device.connect();

        addLog('Call initiated successfully', 'success');

    } catch (error) {
        addLog(`Failed to start call: ${error.message}`, 'error');
        updateStatus('ready', 'Ready');
    }
}

/**
 * End the current call
 */
function endCall() {
    try {
        if (currentConnection) {
            addLog('Ending call...', 'info');
            currentConnection.disconnect();
        } else if (device) {
            device.disconnectAll();
        }
        
    } catch (error) {
        addLog(`Error ending call: ${error.message}`, 'error');
    }
}

/**
 * Disconnect the device
 */
function disconnectDevice() {
    try {
        addLog('Disconnecting device...', 'info');
        
        if (currentConnection) {
            currentConnection.disconnect();
        }
        
        if (device) {
            device.destroy();
            device = null;
        }
        
        updateStatus('disconnected', 'Disconnected');
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        micButton.disabled = true;
        micButton.textContent = '🎤';
        micButton.title = 'Start call';
        
        addLog('Device disconnected successfully', 'success');
        
    } catch (error) {
        addLog(`Error disconnecting: ${error.message}`, 'error');
    }
}

/**
 * Update status indicator
 */
function updateStatus(status, text) {
    statusText.textContent = text;
    statusDot.className = `status-dot ${status}`;
}

/**
 * Add log entry
 */
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logOutput.appendChild(logEntry);
    logOutput.scrollTop = logOutput.scrollHeight;
    
    // Keep only last 50 log entries
    while (logOutput.children.length > 50) {
        logOutput.removeChild(logOutput.firstChild);
    }
}

/**
 * Handle page unload
 */
window.addEventListener('beforeunload', () => {
    if (device) {
        device.destroy();
    }
});
