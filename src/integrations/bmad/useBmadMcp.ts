import { useState, useEffect, useCallback } from 'react';
import { BmadMcpClient, BmadTool, BmadProjectBrief, BmadPRD, BmadArchitecture } from './BmadMcpClient';

export interface UseBmadMcpReturn {
  client: BmadMcpClient | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  availableTools: BmadTool[];
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Project Planning
  createProjectBrief: (projectName: string, description: string, objectives: string[]) => Promise<BmadProjectBrief>;
  generatePRD: (projectBrief: string) => Promise<BmadPRD>;
  validateRequirements: (prdContent: string) => Promise<{ isValid: boolean; feedback: string[] }>;
  
  // Architecture
  createArchitecture: (prdContent: string) => Promise<BmadArchitecture>;
  createFrontendArchitecture: (prdContent: string, backendArchitecture: string) => Promise<BmadArchitecture>;
  
  // Story Management
  createNextStory: (prdContent: string, architectureContent: string, completedStories: string[]) => Promise<any>;
  validateStory: (storyContent: string) => Promise<{ isValid: boolean; feedback: string[] }>;
  
  // Quality Assurance
  runChecklist: (checklistType: string, documentContent: string) => Promise<any>;
  correctCourse: (currentState: string, desiredState: string, constraints: string[]) => Promise<any>;
}

export const useBmadMcp = (serverUrl?: string): UseBmadMcpReturn => {
  const [client, setClient] = useState<BmadMcpClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTools, setAvailableTools] = useState<BmadTool[]>([]);

  // Initialize client
  useEffect(() => {
    const bmadClient = new BmadMcpClient(serverUrl);
    setClient(bmadClient);
  }, [serverUrl]);

  // Connection methods
  const connect = useCallback(async () => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await client.connect();
      setIsConnected(connected);
      
      if (connected) {
        const tools = await client.getAvailableTools();
        setAvailableTools(tools);
      } else {
        setError('Failed to connect to BMAD MCP Server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAvailableTools([]);
    setError(null);
  }, []);

  // Project Planning methods
  const createProjectBrief = useCallback(async (
    projectName: string,
    description: string,
    objectives: string[]
  ): Promise<BmadProjectBrief> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createProjectBrief(projectName, description, objectives);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project brief';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  const generatePRD = useCallback(async (projectBrief: string): Promise<BmadPRD> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.generatePRD(projectBrief);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PRD';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  const validateRequirements = useCallback(async (
    prdContent: string
  ): Promise<{ isValid: boolean; feedback: string[] }> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.validateRequirements(prdContent);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate requirements';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  // Architecture methods
  const createArchitecture = useCallback(async (prdContent: string): Promise<BmadArchitecture> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createArchitecture(prdContent);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create architecture';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  const createFrontendArchitecture = useCallback(async (
    prdContent: string,
    backendArchitecture: string
  ): Promise<BmadArchitecture> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createFrontendArchitecture(prdContent, backendArchitecture);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create frontend architecture';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  // Story Management methods
  const createNextStory = useCallback(async (
    prdContent: string,
    architectureContent: string,
    completedStories: string[]
  ): Promise<any> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.createNextStory(prdContent, architectureContent, completedStories);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create next story';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  const validateStory = useCallback(async (
    storyContent: string
  ): Promise<{ isValid: boolean; feedback: string[] }> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.validateStory(storyContent);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate story';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  // Quality Assurance methods
  const runChecklist = useCallback(async (
    checklistType: string,
    documentContent: string
  ): Promise<any> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.runChecklist(checklistType, documentContent);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run checklist';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  const correctCourse = useCallback(async (
    currentState: string,
    desiredState: string,
    constraints: string[]
  ): Promise<any> => {
    if (!client || !isConnected) {
      throw new Error('BMAD MCP Client not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await client.correctCourse(currentState, desiredState, constraints);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to correct course';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  return {
    client,
    isConnected,
    isLoading,
    error,
    availableTools,
    connect,
    disconnect,
    createProjectBrief,
    generatePRD,
    validateRequirements,
    createArchitecture,
    createFrontendArchitecture,
    createNextStory,
    validateStory,
    runChecklist,
    correctCourse,
  };
};
