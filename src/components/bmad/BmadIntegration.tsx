import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useBmadMcp } from '@/integrations/bmad/useBmadMcp';
import { AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react';

export interface BmadIntegrationProps {
  className?: string;
}

export const BmadIntegration: React.FC<BmadIntegrationProps> = ({ className }) => {
  const {
    isConnected,
    isLoading,
    error,
    availableTools,
    connect,
    disconnect,
    createProjectBrief,
    generatePRD,
    validateRequirements,
  } = useBmadMcp();

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectObjectives, setProjectObjectives] = useState<string[]>(['']);
  const [currentStep, setCurrentStep] = useState<'setup' | 'brief' | 'prd' | 'validation'>('setup');
  const [generatedBrief, setGeneratedBrief] = useState<string>('');
  const [generatedPRD, setGeneratedPRD] = useState<any>(null);

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  const handleAddObjective = () => {
    setProjectObjectives([...projectObjectives, '']);
  };

  const handleUpdateObjective = (index: number, value: string) => {
    const updated = [...projectObjectives];
    updated[index] = value;
    setProjectObjectives(updated);
  };

  const handleRemoveObjective = (index: number) => {
    if (projectObjectives.length > 1) {
      const updated = projectObjectives.filter((_, i) => i !== index);
      setProjectObjectives(updated);
    }
  };

  const handleCreateBrief = async () => {
    if (!projectName || !projectDescription) return;
    
    try {
      const validObjectives = projectObjectives.filter(obj => obj.trim() !== '');
      const brief = await createProjectBrief(projectName, projectDescription, validObjectives);
      setGeneratedBrief(JSON.stringify(brief, null, 2));
      setCurrentStep('prd');
    } catch (err) {
      console.error('Failed to create project brief:', err);
    }
  };

  const handleGeneratePRD = async () => {
    if (!generatedBrief) return;
    
    try {
      const prd = await generatePRD(generatedBrief);
      setGeneratedPRD(prd);
      setCurrentStep('validation');
    } catch (err) {
      console.error('Failed to generate PRD:', err);
    }
  };

  const handleValidateRequirements = async () => {
    if (!generatedPRD) return;
    
    try {
      const validation = await validateRequirements(JSON.stringify(generatedPRD));
      console.log('Validation result:', validation);
    } catch (err) {
      console.error('Failed to validate requirements:', err);
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'setup': return 25;
      case 'brief': return 50;
      case 'prd': return 75;
      case 'validation': return 100;
      default: return 0;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            BMAD MCP Server Integration
          </CardTitle>
          <CardDescription>
            Structured AI-driven development workflows powered by the BMAD methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Connected to BMAD MCP Server
                  </span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Connecting...
                  </span>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {isConnected ? (
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={connect} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reconnect'}
                </Button>
              )}
            </div>
          </div>
          
          {availableTools.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Available Tools: {availableTools.length}
              </p>
              <div className="flex flex-wrap gap-1">
                {availableTools.slice(0, 5).map((tool) => (
                  <span
                    key={tool.name}
                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                  >
                    {tool.name}
                  </span>
                ))}
                {availableTools.length > 5 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                    +{availableTools.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Progress */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Development Workflow</CardTitle>
            <CardDescription>
              Follow the BMAD methodology for structured project development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{getStepProgress()}%</span>
              </div>
              <Progress value={getStepProgress()} className="w-full" />
            </div>

            {/* Step 1: Project Setup */}
            {currentStep === 'setup' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 1: Project Setup</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter your project name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description</Label>
                  <Input
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe your project goals and vision"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Objectives</Label>
                  {projectObjectives.map((objective, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={objective}
                        onChange={(e) => handleUpdateObjective(index, e.target.value)}
                        placeholder={`Objective ${index + 1}`}
                      />
                      {projectObjectives.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveObjective(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddObjective}>
                    Add Objective
                  </Button>
                </div>

                <Button 
                  onClick={handleCreateBrief}
                  disabled={!projectName || !projectDescription || isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Project Brief
                </Button>
              </div>
            )}

            {/* Step 2: PRD Generation */}
            {currentStep === 'prd' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 2: Generate PRD</h3>
                <p className="text-sm text-muted-foreground">
                  Project brief created successfully. Generate a comprehensive Product Requirements Document.
                </p>
                
                <Button 
                  onClick={handleGeneratePRD}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate PRD
                </Button>
              </div>
            )}

            {/* Step 3: Validation */}
            {currentStep === 'validation' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 3: Validate Requirements</h3>
                <p className="text-sm text-muted-foreground">
                  PRD generated successfully. Run quality validation checks.
                </p>
                
                <Button 
                  onClick={handleValidateRequirements}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Validate Requirements
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
