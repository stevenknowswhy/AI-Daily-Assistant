# BMAD MCP Server Integration

## Overview

The AI Daily Assistant now includes full integration with the BMAD (Breakthrough Method of Agile AI-driven Development) MCP Server, enabling structured AI-driven development workflows directly within the application.

## What is BMAD?

BMAD is a comprehensive methodology that combines AI agents with Agile development practices to create a structured approach to software development. The BMAD MCP Server exposes 9 powerful tools through the Model Context Protocol (MCP) standard.

### BMAD Tools Available

#### Project Planning Tools
- **`create_project_brief`** - Generate structured project briefs with objectives and constraints
- **`generate_prd`** - Create comprehensive Product Requirements Documents with epics and stories
- **`validate_requirements`** - Check PRDs against PM quality standards and best practices

#### Architecture Tools
- **`create_architecture`** - Generate technical architecture documents with component design
- **`create_frontend_architecture`** - Design frontend-specific architectures with UI/UX considerations
- **`validate_architecture`** - Quality check architectures against technical standards

#### Story Management Tools
- **`create_next_story`** - Generate development-ready user stories from PRDs and architecture
- **`validate_story`** - Check stories against Definition of Done criteria

#### Quality Assurance Tools
- **`run_checklist`** - Execute BMAD quality checklists against any document
- **`correct_course`** - Handle change management and course correction scenarios

## Integration Architecture

### Components

1. **BmadMcpClient** (`src/integrations/bmad/BmadMcpClient.ts`)
   - TypeScript client for communicating with the BMAD MCP Server
   - Handles all 9 BMAD tools with proper error handling
   - Provides structured interfaces for all BMAD data types

2. **useBmadMcp Hook** (`src/integrations/bmad/useBmadMcp.ts`)
   - React hook for easy integration with React components
   - Manages connection state, loading states, and error handling
   - Provides all BMAD functionality through a clean React API

3. **BmadIntegration Component** (`src/components/bmad/BmadIntegration.tsx`)
   - Full-featured UI component for BMAD workflow management
   - Guided workflow from project setup through PRD generation and validation
   - Real-time connection status and tool availability display

4. **Dashboard Integration**
   - BMAD status card in the main dashboard
   - Quick access to BMAD development workflows
   - Real-time server status monitoring

## Setup Instructions

### Prerequisites

- Docker and Docker Compose installed
- At least one LLM API key (OpenAI, Anthropic, or Google Gemini)
- Node.js 18+ for the AI Daily Assistant

### Quick Setup

1. **Run the automated setup script:**
   ```bash
   ./scripts/setup-bmad.sh
   ```

2. **Configure API keys in `bmap_mcp/.env`:**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   GEMINI_API_KEY=your_google_gemini_key_here
   ```

3. **Start the AI Daily Assistant:**
   ```bash
   npm run dev
   ```

### Manual Setup

1. **Clone BMAD MCP Server:**
   ```bash
   git clone https://github.com/fuchsst/bmap_mcp.git
   ```

2. **Configure environment:**
   ```bash
   cd bmap_mcp
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start BMAD MCP Server:**
   ```bash
   docker-compose up -d bmad-mcp-server
   ```

4. **Verify server is running:**
   ```bash
   curl http://localhost:8000/health
   ```

## Usage Guide

### Basic Workflow

1. **Access BMAD Integration**
   - Navigate to the AI Daily Assistant dashboard
   - The BMAD integration will automatically attempt to connect to the MCP server
   - Green status indicates successful connection

2. **Create a Project Brief**
   - Enter project name and description
   - Add project objectives (goals you want to achieve)
   - Click "Create Project Brief" to generate structured documentation

3. **Generate PRD**
   - After project brief creation, proceed to PRD generation
   - The system will create a comprehensive Product Requirements Document
   - Includes epics, user stories, and technical requirements

4. **Validate Requirements**
   - Run quality validation checks on your PRD
   - Get feedback on completeness, clarity, and technical feasibility
   - Iterate based on validation results

### Advanced Features

#### Custom Tool Execution
```typescript
import { useBmadMcp } from '@/integrations/bmad/useBmadMcp';

const MyComponent = () => {
  const { createArchitecture, isConnected } = useBmadMcp();
  
  const handleCreateArchitecture = async () => {
    if (isConnected) {
      const architecture = await createArchitecture(prdContent);
      console.log('Generated architecture:', architecture);
    }
  };
};
```

#### Story Management
```typescript
const { createNextStory, validateStory } = useBmadMcp();

// Create next development story
const story = await createNextStory(
  prdContent,
  architectureContent,
  completedStories
);

// Validate story quality
const validation = await validateStory(storyContent);
```

## Configuration Options

### Environment Variables

The BMAD MCP Server supports extensive configuration through environment variables:

```env
# LLM Provider Configuration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_google_gemini_key_here

# Server Configuration
BMAD_LOG_LEVEL=INFO
BMAD_MAX_CONCURRENT_TOOLS=5
BMAD_TOOL_TIMEOUT_SECONDS=300

# CrewAI Agent Configuration
BMAD_DEFAULT_LLM=openai/gpt-4o-mini
CREWAI_VERBOSE=false

# Agent-Specific LLM Configuration
BMAD_ANALYST_AGENT_LLM=anthropic/claude-3-haiku-20240307
BMAD_PM_AGENT_LLM=openai/gpt-4-turbo
BMAD_ARCHITECT_AGENT_LLM=google/gemini-1.5-pro-latest
```

### Docker Compose Configuration

The integration includes a complete Docker Compose setup (`docker-compose.bmad.yml`) that provides:

- AI Daily Assistant frontend container
- BMAD MCP Server container
- Optional Redis for caching
- Optional PostgreSQL for persistent storage
- Proper networking and health checks

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify BMAD MCP Server is running: `docker ps`
   - Check server logs: `docker-compose -f bmap_mcp/docker-compose.yml logs bmad-mcp-server`
   - Ensure port 8000 is not blocked

2. **API Key Errors**
   - Verify API keys are correctly set in `bmap_mcp/.env`
   - Ensure at least one LLM provider key is configured
   - Check API key permissions and quotas

3. **Tool Execution Failures**
   - Check BMAD server logs for detailed error messages
   - Verify input parameters match expected schema
   - Ensure sufficient API quota for LLM calls

### Debug Commands

```bash
# Check server status
curl http://localhost:8000/health

# List available tools
curl http://localhost:8000/tools

# View server logs
docker-compose -f bmap_mcp/docker-compose.yml logs bmad-mcp-server

# Restart server
docker-compose -f bmap_mcp/docker-compose.yml restart bmad-mcp-server
```

## Performance Considerations

### Bundle Size Impact

The BMAD integration adds minimal overhead to the application:
- Client code: ~15KB (gzipped)
- No impact on initial bundle size due to code splitting
- Lazy-loaded components ensure optimal performance

### Server Resources

The BMAD MCP Server requires:
- Memory: 512MB minimum, 1GB recommended
- CPU: 1 core minimum, 2 cores recommended for concurrent operations
- Network: Outbound HTTPS for LLM API calls

## Security Considerations

1. **API Key Management**
   - Store API keys securely in environment variables
   - Never commit API keys to version control
   - Use different keys for development and production

2. **Network Security**
   - BMAD MCP Server runs on localhost by default
   - Configure firewall rules for production deployments
   - Use HTTPS in production environments

3. **Data Privacy**
   - Project data is processed by configured LLM providers
   - Review LLM provider data policies
   - Consider on-premises deployment for sensitive projects

## Future Enhancements

- Integration with project management tools (Jira, Linear)
- Real-time collaboration features
- Advanced workflow customization
- Integration with CI/CD pipelines
- Support for custom BMAD agents and templates

## Support

For issues and questions:
- AI Daily Assistant: Create issues in this repository
- BMAD MCP Server: Visit [fuchsst/bmap_mcp](https://github.com/fuchsst/bmap_mcp)
- BMAD Methodology: Visit [bmadcode/BMAD-METHOD](https://github.com/bmadcode/BMAD-METHOD)
