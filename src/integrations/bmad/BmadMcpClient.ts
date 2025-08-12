/**
 * BMAD MCP Client Integration
 * 
 * This client provides integration with the BMAD MCP Server for structured
 * AI-driven development workflows within the AI Daily Assistant.
 */

export interface BmadTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface BmadToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface BmadProjectBrief {
  title: string;
  description: string;
  objectives: string[];
  constraints: string[];
  stakeholders: string[];
  timeline: string;
}

export interface BmadPRD {
  title: string;
  overview: string;
  epics: Array<{
    id: string;
    title: string;
    description: string;
    stories: Array<{
      id: string;
      title: string;
      description: string;
      acceptanceCriteria: string[];
    }>;
  }>;
}

export interface BmadArchitecture {
  title: string;
  overview: string;
  components: Array<{
    name: string;
    description: string;
    responsibilities: string[];
    interfaces: string[];
  }>;
  dataFlow: string;
  deploymentStrategy: string;
}

export class BmadMcpClient {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize connection to BMAD MCP Server
   */
  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('Failed to connect to BMAD MCP Server:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get available BMAD tools
   */
  async getAvailableTools(): Promise<BmadTool[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to BMAD MCP Server');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tools`);
      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.error('Failed to get available tools:', error);
      return [];
    }
  }

  /**
   * Execute a BMAD tool
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<BmadToolResult> {
    if (!this.isConnected) {
      throw new Error('Not connected to BMAD MCP Server');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arguments: args }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to execute tool ${toolName}:`, error);
      return {
        content: [{ type: 'text', text: `Error executing ${toolName}: ${error}` }],
        isError: true,
      };
    }
  }

  // Project Planning Tools
  async createProjectBrief(
    projectName: string,
    description: string,
    objectives: string[]
  ): Promise<BmadProjectBrief> {
    const result = await this.executeTool('create_project_brief', {
      project_name: projectName,
      description,
      objectives,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to create project brief');
    }

    // Parse the result and return structured data
    const briefText = result.content[0]?.text || '';
    return this.parseProjectBrief(briefText);
  }

  async generatePRD(projectBrief: string): Promise<BmadPRD> {
    const result = await this.executeTool('generate_prd', {
      project_brief: projectBrief,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to generate PRD');
    }

    const prdText = result.content[0]?.text || '';
    return this.parsePRD(prdText);
  }

  async validateRequirements(prdContent: string): Promise<{ isValid: boolean; feedback: string[] }> {
    const result = await this.executeTool('validate_requirements', {
      prd_content: prdContent,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to validate requirements');
    }

    const validationText = result.content[0]?.text || '';
    return this.parseValidationResult(validationText);
  }

  // Architecture Tools
  async createArchitecture(prdContent: string): Promise<BmadArchitecture> {
    const result = await this.executeTool('create_architecture', {
      prd_content: prdContent,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to create architecture');
    }

    const architectureText = result.content[0]?.text || '';
    return this.parseArchitecture(architectureText);
  }

  async createFrontendArchitecture(
    prdContent: string,
    backendArchitecture: string
  ): Promise<BmadArchitecture> {
    const result = await this.executeTool('create_frontend_architecture', {
      prd_content: prdContent,
      backend_architecture: backendArchitecture,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to create frontend architecture');
    }

    const architectureText = result.content[0]?.text || '';
    return this.parseArchitecture(architectureText);
  }

  // Story Management Tools
  async createNextStory(
    prdContent: string,
    architectureContent: string,
    completedStories: string[]
  ): Promise<any> {
    const result = await this.executeTool('create_next_story', {
      prd_content: prdContent,
      architecture_content: architectureContent,
      completed_stories: completedStories,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to create next story');
    }

    return this.parseStory(result.content[0]?.text || '');
  }

  async validateStory(storyContent: string): Promise<{ isValid: boolean; feedback: string[] }> {
    const result = await this.executeTool('validate_story', {
      story_content: storyContent,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to validate story');
    }

    const validationText = result.content[0]?.text || '';
    return this.parseValidationResult(validationText);
  }

  // Quality Tools
  async runChecklist(checklistType: string, documentContent: string): Promise<any> {
    const result = await this.executeTool('run_checklist', {
      checklist_type: checklistType,
      document_content: documentContent,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to run checklist');
    }

    return this.parseChecklistResult(result.content[0]?.text || '');
  }

  async correctCourse(
    currentState: string,
    desiredState: string,
    constraints: string[]
  ): Promise<any> {
    const result = await this.executeTool('correct_course', {
      current_state: currentState,
      desired_state: desiredState,
      constraints,
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Failed to correct course');
    }

    return this.parseCourseCorrection(result.content[0]?.text || '');
  }

  // Private parsing methods
  private parseProjectBrief(text: string): BmadProjectBrief {
    // Implementation would parse the markdown/text response into structured data
    // This is a simplified version
    return {
      title: 'Generated Project Brief',
      description: text.substring(0, 200) + '...',
      objectives: [],
      constraints: [],
      stakeholders: [],
      timeline: 'TBD',
    };
  }

  private parsePRD(text: string): BmadPRD {
    // Implementation would parse the PRD markdown into structured data
    return {
      title: 'Generated PRD',
      overview: text.substring(0, 200) + '...',
      epics: [],
    };
  }

  private parseArchitecture(text: string): BmadArchitecture {
    // Implementation would parse the architecture document
    return {
      title: 'Generated Architecture',
      overview: text.substring(0, 200) + '...',
      components: [],
      dataFlow: '',
      deploymentStrategy: '',
    };
  }

  private parseValidationResult(text: string): { isValid: boolean; feedback: string[] } {
    // Implementation would parse validation results
    return {
      isValid: !text.toLowerCase().includes('error'),
      feedback: [text],
    };
  }

  private parseStory(text: string): any {
    // Implementation would parse story content
    return {
      title: 'Generated Story',
      content: text,
    };
  }

  private parseChecklistResult(text: string): any {
    // Implementation would parse checklist results
    return {
      passed: true,
      results: [text],
    };
  }

  private parseCourseCorrection(text: string): any {
    // Implementation would parse course correction recommendations
    return {
      recommendations: [text],
    };
  }
}
