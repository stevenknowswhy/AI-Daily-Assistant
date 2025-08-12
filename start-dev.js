#!/usr/bin/env node

/**
 * AI Daily Assistant Development Server Manager
 * ==========================================
 * 
 * Concurrently runs all development services:
 * - Frontend (React/Vite) on port 5174
 * - Backend (Twilio-OpenRouter) on port 3005
 * - Chatterbox TTS Server on port 8000 (optional)
 * 
 * Usage: node start-dev.js [options]
 * Options:
 *   --no-tts     Skip starting Chatterbox TTS server
 *   --frontend   Start only frontend
 *   --backend    Start only backend
 *   --help       Show this help message
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Service configurations
const services = {
  frontend: {
    name: 'Frontend (React/Vite)',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: process.cwd(),
    port: 5174,
    color: colors.cyan,
    env: { ...process.env, PORT: '5174' }
  },
  backend: {
    name: 'Backend (Twilio-OpenRouter)',
    command: 'npm',
    args: ['start'],
    cwd: path.join(process.cwd(), 'twilio-openrouter-voice'),
    port: 3005,
    color: colors.green,
    env: { ...process.env, PORT: '3005' }
  },
  chatterbox: {
    name: 'Chatterbox TTS Server',
    command: 'python',
    args: ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
    cwd: path.join(process.cwd(), 'src', 'features', 'chatterbox', 'server'),
    port: 8000,
    color: colors.magenta,
    env: { ...process.env, PORT: '8000' },
    optional: true
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  noTts: args.includes('--no-tts'),
  frontendOnly: args.includes('--frontend'),
  backendOnly: args.includes('--backend'),
  help: args.includes('--help')
};

// Help message
if (options.help) {
  console.log(`
${colors.bright}AI Daily Assistant Development Server Manager${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node start-dev.js [options]

${colors.yellow}Options:${colors.reset}
  --no-tts     Skip starting Chatterbox TTS server
  --frontend   Start only frontend service
  --backend    Start only backend service
  --help       Show this help message

${colors.yellow}Services:${colors.reset}
  ${colors.cyan}Frontend${colors.reset}     React/Vite development server (port 5174)
  ${colors.green}Backend${colors.reset}      Twilio-OpenRouter voice service (port 3005)
  ${colors.magenta}Chatterbox${colors.reset}   TTS server for voice synthesis (port 8000)

${colors.yellow}Examples:${colors.reset}
  node start-dev.js                    # Start all services
  node start-dev.js --no-tts          # Start without TTS server
  node start-dev.js --frontend        # Start only frontend
  node start-dev.js --backend         # Start only backend
`);
  process.exit(0);
}

// Active processes tracking
const processes = new Map();
let isShuttingDown = false;

// Utility functions
function log(service, message, isError = false) {
  const timestamp = new Date().toLocaleTimeString();
  const serviceColor = services[service]?.color || colors.white;
  const messageColor = isError ? colors.red : colors.white;
  
  console.log(
    `${colors.bright}[${timestamp}]${colors.reset} ` +
    `${serviceColor}[${service.toUpperCase()}]${colors.reset} ` +
    `${messageColor}${message}${colors.reset}`
  );
}

function checkServiceAvailability(service) {
  const config = services[service];
  
  // Check if directory exists
  if (!fs.existsSync(config.cwd)) {
    log(service, `Directory not found: ${config.cwd}`, true);
    return false;
  }
  
  // Check for package.json for npm services
  if (config.command === 'npm') {
    const packageJsonPath = path.join(config.cwd, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log(service, `package.json not found in: ${config.cwd}`, true);
      return false;
    }
  }
  
  // Check for Python for Chatterbox TTS
  if (service === 'chatterbox' && config.command === 'python') {
    const mainPyPath = path.join(config.cwd, 'main.py');
    if (!fs.existsSync(mainPyPath)) {
      log(service, `main.py not found in: ${config.cwd}`, true);
      return false;
    }
  }
  
  return true;
}

function startService(serviceName) {
  const config = services[serviceName];
  
  if (!checkServiceAvailability(serviceName)) {
    if (config.optional) {
      log(serviceName, 'Service not available, skipping (optional)');
      return null;
    } else {
      log(serviceName, 'Service not available, cannot start', true);
      return null;
    }
  }
  
  log(serviceName, `Starting ${config.name}...`);
  
  const process = spawn(config.command, config.args, {
    cwd: config.cwd,
    env: config.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: os.platform() === 'win32'
  });
  
  // Handle process output
  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(serviceName, output);
    }
  });
  
  process.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('ExperimentalWarning')) {
      log(serviceName, output, true);
    }
  });
  
  // Handle process events
  process.on('spawn', () => {
    log(serviceName, `${config.name} started successfully on port ${config.port}`);
  });
  
  process.on('error', (error) => {
    log(serviceName, `Failed to start: ${error.message}`, true);
    processes.delete(serviceName);
  });
  
  process.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      if (code === 0) {
        log(serviceName, `${config.name} exited normally`);
      } else {
        log(serviceName, `${config.name} exited with code ${code}${signal ? ` (${signal})` : ''}`, true);
        
        // Auto-restart on crash (except during shutdown)
        setTimeout(() => {
          if (!isShuttingDown && !processes.has(serviceName)) {
            log(serviceName, 'Attempting to restart...');
            const newProcess = startService(serviceName);
            if (newProcess) {
              processes.set(serviceName, newProcess);
            }
          }
        }, 2000);
      }
    }
    processes.delete(serviceName);
  });
  
  return process;
}

function gracefulShutdown() {
  if (isShuttingDown) return;
  
  isShuttingDown = true;
  console.log(`\n${colors.yellow}Shutting down all services...${colors.reset}`);
  
  // Kill all processes
  for (const [serviceName, process] of processes) {
    log(serviceName, 'Stopping...');
    
    // Try graceful shutdown first
    process.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    }, 5000);
  }
  
  // Exit after all processes are cleaned up
  setTimeout(() => {
    console.log(`${colors.green}All services stopped. Goodbye!${colors.reset}`);
    process.exit(0);
  }, 6000);
}

// Main execution
function main() {
  console.log(`${colors.bright}🚀 AI Daily Assistant Development Server Manager${colors.reset}\n`);
  
  // Determine which services to start
  const servicesToStart = [];
  
  if (options.frontendOnly) {
    servicesToStart.push('frontend');
  } else if (options.backendOnly) {
    servicesToStart.push('backend');
  } else {
    servicesToStart.push('frontend', 'backend');
    if (!options.noTts) {
      servicesToStart.push('chatterbox');
    }
  }
  
  // Start services
  for (const serviceName of servicesToStart) {
    const process = startService(serviceName);
    if (process) {
      processes.set(serviceName, process);
    }
  }
  
  if (processes.size === 0) {
    console.log(`${colors.red}No services could be started. Exiting.${colors.reset}`);
    process.exit(1);
  }
  
  // Setup graceful shutdown
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGQUIT', gracefulShutdown);
  
  // Keep the script running
  console.log(`\n${colors.green}All services started! Press Ctrl+C to stop.${colors.reset}\n`);
}

// Run the script
main();
