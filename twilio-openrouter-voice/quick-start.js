import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3005;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public/static')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Import and use test routes
const { testRoutes } = await import('./src/routes/test.js');
app.use('/test', testRoutes);

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve test page at root with CSP nonce injection
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'public/test.html');
  
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Error loading test page');
      return;
    }
    
    // Generate a simple nonce for CSP
    const nonce = Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);
    
    // Inject nonce into script tag
    const modifiedHtml = html.replace(
      '<script src="/static/js/test.js"></script>',
      `<script nonce="${nonce}" src="/static/js/test.js"></script>`
    );
    
    res.setHeader('Content-Type', 'text/html');
    res.send(modifiedHtml);
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🧪 Test page: http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`✅ Calendar auth: http://localhost:${port}/test/calendar/auth`);
  console.log(`✅ Gmail auth: http://localhost:${port}/test/gmail/auth`);
});
