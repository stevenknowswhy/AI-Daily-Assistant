# 📞 Twilio-OpenRouter Voice Integration

A complete telephony infrastructure that connects incoming phone calls directly to OpenRouter LLM for voice conversations, replacing RetellAI in the AI Daily Assistant project.

## 🚀 Features

- **Voice-to-AI Conversations**: Real-time speech-to-text and text-to-speech
- **OpenRouter LLM Integration**: Primary model `z-ai/glm-4.5-air:free` with fallback
- **Twilio Telephony**: Handle incoming/outbound calls on `+14158552745`
- **Conversation Management**: Context-aware multi-turn conversations
- **Call Logging**: Supabase integration for call analytics
- **Test Interface**: Web-based testing and monitoring dashboard
- **Error Handling**: Comprehensive error handling and retry logic

## 🔧 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Server**
   ```bash
   npm start
   ```

3. **Open Test Page**
   ```
   http://localhost:3001
   ```

4. **Test Voice Call**
   ```
   Call: +14158552745
   ```

## ⚙️ Configuration

All API credentials are pre-configured in `.env`:

- **Twilio**: Account SID, Auth Token, Phone Number
- **OpenRouter**: API Key, Models (primary + fallback)
- **Supabase**: Database URL and keys for call logging

## 🧪 Testing

### Web Dashboard
- Open `http://localhost:3001` for interactive testing
- Test OpenRouter LLM connectivity
- Test Twilio phone system
- Make test calls and monitor logs

### Voice Testing
1. Call `+14158552745`
2. Speak naturally to the AI
3. Have a conversation
4. Check logs in the web dashboard

## 📞 How It Works

```
Phone Call → Twilio → Webhook → OpenRouter LLM → Voice Response
     ↓
  Supabase Database (Call Logs)
```

1. **Incoming Call**: Twilio receives call on `+14158552745`
2. **Speech-to-Text**: Twilio converts voice to text
3. **AI Processing**: OpenRouter LLM generates response
4. **Text-to-Speech**: Twilio speaks AI response
5. **Logging**: Conversation saved to Supabase

## 🔍 API Endpoints

- `GET /` - Test dashboard
- `GET /health` - System health check
- `POST /webhook/voice` - Twilio voice webhook
- `GET /test/all` - Run all connectivity tests
- `POST /twilio/calls` - Make outbound calls

## 🚨 Troubleshooting

**No Response to Calls?**
- Check server is running on port 3001
- Verify webhook URL in Twilio console
- Test with `GET /webhook/health`

**AI Not Responding?**
- Test OpenRouter: `GET /test/openrouter`
- Check API key and model availability
- Review logs for errors

**Calls Not Logging?**
- Test Supabase: Check database connection
- Verify environment variables
- Check table permissions

## 🔐 Security

- All API keys configured securely
- Rate limiting enabled
- Input validation and sanitization
- Production-ready error handling

## 📈 Integration

This system replaces RetellAI and integrates with:
- Existing AI Daily Assistant Supabase database
- User authentication and management
- Call scheduling and analytics

## 🎯 Next Steps

1. **Set up ngrok** for webhook development
2. **Configure Twilio webhooks** to point to your server
3. **Test voice conversations** with the AI
4. **Monitor call logs** in Supabase
5. **Customize AI responses** for daily briefings

---

**Ready to test your AI voice assistant!** 🚀