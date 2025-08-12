import { config } from 'dotenv';

// Load environment variables
config();

console.log('Starting Twilio-OpenRouter Voice Integration Server...');

try {
  const { VoiceIntegrationServer } = await import('./src/server.js');
  
  const server = new VoiceIntegrationServer();
  
  // Start server directly without hanging config validation
  server.server = server.app.listen(server.port, server.host, () => {
    console.log(`🚀 Twilio-OpenRouter Voice Integration Server started`);
    console.log(`📞 Server running on http://${server.host}:${server.port}`);
    console.log(`🧪 Test page available at http://${server.host}:${server.port}`);
    console.log(`📋 Health check: http://${server.host}:${server.port}/health`);
    console.log(`🔗 Webhook endpoint: http://${server.host}:${server.port}/webhook`);
    console.log(`✅ Google Calendar auth: http://${server.host}:${server.port}/test/calendar/auth`);
    console.log(`✅ Gmail auth: http://${server.host}:${server.port}/test/gmail/auth`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down server...');
    server.server.close(() => {
      console.log('✅ Server shut down gracefully');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    server.server.close(() => {
      console.log('✅ Server shut down gracefully');
      process.exit(0);
    });
  });

} catch (error) {
  console.error('Error during server startup:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
