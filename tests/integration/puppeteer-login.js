#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const FRONTEND_PORT = 5173;
const BACKEND_PORT = 3005;  // Backend runs on 3005, not 3001
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Function to wait for server to be ready
async function waitForServer(url, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

// Function to start a server process
function startServer(command, args, cwd, name) {
  log(`Starting ${name}...`, colors.cyan);
  
  const process = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: true
  });

  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`[${name}] ${output}`, colors.blue);
    }
  });

  process.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('ExperimentalWarning')) {
      log(`[${name}] ${output}`, colors.yellow);
    }
  });

  process.on('close', (code) => {
    log(`${name} exited with code ${code}`, code === 0 ? colors.green : colors.red);
  });

  return process;
}

async function main() {
  log('🚀 Starting AI Daily Assistant with Puppeteer for Google OAuth', colors.bright);
  
  const processes = [];
  
  try {
    // Start backend server
    const backendProcess = startServer(
      'npm',
      ['start'],
      join(__dirname, 'twilio-openrouter-voice'),
      'Backend'
    );
    processes.push(backendProcess);

    // Start frontend server
    const frontendProcess = startServer(
      'npm',
      ['run', 'dev'],
      __dirname,
      'Frontend'
    );
    processes.push(frontendProcess);

    // Wait for servers to be ready
    log('⏳ Waiting for backend server to be ready...', colors.yellow);
    await waitForServer(BACKEND_URL);
    log('✅ Backend server is ready!', colors.green);

    log('⏳ Waiting for frontend server to be ready...', colors.yellow);
    await waitForServer(FRONTEND_URL);
    log('✅ Frontend server is ready!', colors.green);

    // Launch Puppeteer with visible browser
    log('🌐 Launching browser...', colors.magenta);
    const browser = await puppeteer.launch({
      headless: false, // Make browser visible
      defaultViewport: null, // Use full screen
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    
    // Navigate to the app
    log(`📱 Opening app at ${FRONTEND_URL}`, colors.cyan);
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });

    // Set up console logging from the page
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const color = type === 'error' ? colors.red : 
                   type === 'warning' ? colors.yellow : 
                   colors.blue;
      log(`[Browser ${type}] ${text}`, color);
    });

    // Set up error handling
    page.on('pageerror', error => {
      log(`[Page Error] ${error.message}`, colors.red);
    });

    log('🎉 Browser is ready! You can now interact with the app and log in with Google.', colors.green);
    log('📝 Instructions:', colors.bright);
    log('   1. The app should be loaded in the browser window', colors.reset);
    log('   2. Click on the Google login button when you see it', colors.reset);
    log('   3. Complete the Google OAuth flow in the browser', colors.reset);
    log('   4. The browser will remain open for you to test the app', colors.reset);
    log('   5. Press Ctrl+C in this terminal to stop all servers and close the browser', colors.reset);

    // Keep the script running
    process.on('SIGINT', async () => {
      log('\n🛑 Shutting down...', colors.yellow);
      
      // Close browser
      if (browser) {
        await browser.close();
        log('✅ Browser closed', colors.green);
      }
      
      // Kill all processes
      processes.forEach(proc => {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      });
      
      log('✅ All servers stopped', colors.green);
      process.exit(0);
    });

    // Wait indefinitely
    await new Promise(() => {});

  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    
    // Clean up processes
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    });
    
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log(`❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});
