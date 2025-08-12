# Chatterbox TTS Feature Module

This module provides Chatterbox TTS integration for the AI Daily Assistant, replacing the existing Jarvis TTS functionality with a more advanced local text-to-speech solution.

## Phase 1: Standalone Implementation ✅

The Chatterbox module has been implemented as a standalone feature following the project's feature-colocation pattern.

### Components

- **ChatterboxService**: Core service for interacting with the Chatterbox TTS server
- **ChatterboxVoiceInterface**: React component for voice interactions (replacement for JarvisVoiceInterface)
- **ChatterboxTestPage**: Standalone test page for manual verification

### Features

- ✅ Text-to-speech generation using local Chatterbox server
- ✅ Speech recognition for voice input
- ✅ Voice message history
- ✅ Configurable voice settings (exaggeration, seed, voice selection)
- ✅ Server health monitoring
- ✅ Error handling and fallbacks
- ✅ Audio playback controls

## Testing

### Access the Test Page

1. Start the development server: `npm run dev`
2. Navigate to: `http://localhost:5173/?test=chatterbox`

### Prerequisites

Before testing, you need to set up the Chatterbox TTS server locally:

1. **Install Python 3.11** (if not already installed):
   ```bash
   brew install python@3.11
   ```

2. **Set up Chatterbox TTS Server**:
   ```bash
   python3.11 -m venv chatterbox_env
   source chatterbox_env/bin/activate
   git clone https://github.com/devnen/Chatterbox-TTS-Server.git
   cd Chatterbox-TTS-Server
   pip install -r requirements.txt
   pip install chatterbox-tts
   ```

3. **Start the server**:
   ```bash
   # For Apple Silicon Macs
   python server.py --host 127.0.0.1 --port 8000 --device mps
   
   # For Intel Macs
   python server.py --host 127.0.0.1 --port 8000 --device cpu
   ```

4. **Verify server is running**:
   - Open http://localhost:8000 in your browser
   - You should see the Chatterbox web UI

### Test Scenarios

1. **Server Health Check**: Verify the test page shows "Server available"
2. **Text-to-Speech**: Enter text and click "Generate Speech"
3. **Voice Interface**: Click "Show Voice Interface" and test voice commands
4. **Configuration**: Adjust voice settings and test different configurations

## Architecture

```
src/features/chatterbox/
├── components/
│   ├── ChatterboxVoiceInterface.tsx  # Main voice interface component
│   └── ChatterboxTestPage.tsx        # Test page for manual verification
├── services/
│   └── ChatterboxService.ts          # Core TTS service
├── types/
│   └── chatterbox.types.ts           # TypeScript type definitions
├── index.ts                          # Public API exports
└── README.md                         # This file
```

## Configuration

Default configuration:
```typescript
{
  baseUrl: 'http://localhost:8000',
  model: 'chatterbox',
  voice: 'default',
  exaggeration: 0.5,
  seed: 42,
  timeout: 30000
}
```

## Next Steps (Phase 2)

Phase 2 will involve systematically replacing Jarvis components with Chatterbox:

1. Identify all Jarvis web-based voice components
2. Create migration plan
3. Replace components one-by-one
4. Preserve Twilio phone call functionality
5. Update tests and documentation

**Note**: Phase 2 should only begin after Phase 1 is confirmed working through manual testing.
