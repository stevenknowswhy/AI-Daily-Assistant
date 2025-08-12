import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Eye, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Suspense, lazy } from 'react';
const DailyBriefingModal = lazy(() => import('../DailyBriefingModal').then(m => ({ default: m.DailyBriefingModal })));
import { DailyBriefingWidgetProps, BriefingPreview } from '../../../types/dashboard';
import { dailyBriefingService, BriefingData } from '../../../services/dailyBriefingService';
import toast from 'react-hot-toast';

export const DailyBriefingWidget: React.FC<DailyBriefingWidgetProps> = ({
  isLoadingDailySummary,
  dailySummaryResponse,
  showDailyBriefingModal,
  onDailySummaryClick,
  onCloseDailyBriefingModal
}) => {
  const [briefingPreview, setBriefingPreview] = useState<BriefingData | null>(null);

  // Load briefing preview on component mount
  useEffect(() => {
    loadBriefingPreview();
  }, []);

  // Save briefing preview when dailySummaryResponse changes
  useEffect(() => {
    if (dailySummaryResponse && dailySummaryResponse.trim()) {
      // Convert dailySummaryResponse to BriefingData format
      const briefingData: BriefingData = {
        id: Date.now().toString(),
        userId: 'dashboard-user',
        content: dailySummaryResponse,
        generatedAt: new Date().toISOString(),
        preview: generatePreview(dailySummaryResponse)
      };
      setBriefingPreview(briefingData);
    }
  }, [dailySummaryResponse]);

  const loadBriefingPreview = async () => {
    try {
      const briefing = await dailyBriefingService.getBriefing();
      setBriefingPreview(briefing);
    } catch (error) {
      console.error('Failed to load briefing preview:', error);
    }
  };

  // Generate preview text (first 2-3 sentences)
  const generatePreview = (content: string): string => {
    if (!content) return '';

    // Split by sentences and take first 2-3
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const previewSentences = sentences.slice(0, 3);
    let preview = previewSentences.join('. ');

    // Add ellipsis if there are more sentences
    if (sentences.length > 3) {
      preview += '...';
    } else if (preview && !preview.endsWith('.')) {
      preview += '.';
    }

    return preview;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  // Handle regenerate briefing
  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Clear current briefing
      setBriefingPreview(null);
      dailyBriefingService.clearBriefing();

      toast.loading('Regenerating briefing...', { id: 'briefing-regen' });

      // Generate new briefing using the service
      const result = await dailyBriefingService.generateBriefing();

      if (result.success && result.briefing) {
        // Reload the briefing preview
        await loadBriefingPreview();
        toast.success('Briefing regenerated successfully', { id: 'briefing-regen' });
      } else {
        throw new Error(result.error || 'Failed to regenerate briefing');
      }
    } catch (error) {
      console.error('Failed to regenerate briefing:', error);
      toast.error('Failed to regenerate briefing', { id: 'briefing-regen' });
    }
  };

  // Handle view full briefing
  const handleViewFull = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDailySummaryClick();
  };
  return (
    <>
      <Card
        className="glass-card-green cursor-pointer touch-manipulation p-6 xl:p-8 2xl:p-10"
        onClick={briefingPreview ? handleViewFull : onDailySummaryClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-foreground">Daily Briefing</CardTitle>
            {briefingPreview && !isLoadingDailySummary && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRegenerate}
                className="h-4 w-4 hover:bg-accent/50 dark:hover:bg-green-900"
                title="Regenerate briefing"
              >
                <RotateCcw className="h-3 w-3 text-green-600 dark:text-green-400" />
              </Button>
            )}
          </div>
          {isLoadingDailySummary ? (
            <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400 animate-spin" />
          ) : briefingPreview ? (
            <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
        </CardHeader>
        <CardContent>
          {isLoadingDailySummary ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground">
                Generating...
              </div>
              <p className="text-xs text-muted-foreground">
                Creating your daily summary...
              </p>
            </div>
          ) : briefingPreview ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                Latest Briefing
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {briefingPreview.preview}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDate(briefingPreview.generatedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewFull}
                  className="h-6 px-2 text-xs text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Full Briefing
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-foreground">
                No briefing has been run yet.
              </div>
              <p className="text-sm text-muted-foreground">
                Generate your first daily briefing to get started with personalized insights about your day.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onDailySummaryClick}
                className="mt-2 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate Briefing
              </Button>
            </div>
          )}

          <div className="mt-2">
            <div className="w-full bg-green-100 dark:bg-green-900 rounded-full h-1">
              <div
                className={`bg-green-600 h-1 rounded-full transition-all duration-300 ${
                  isLoadingDailySummary ? 'w-1/2 animate-pulse' : briefingPreview ? 'w-full' : 'w-1/4'
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Briefing Modal */}
      <Suspense fallback={null}>
        <DailyBriefingModal
          isOpen={showDailyBriefingModal}
          onClose={onCloseDailyBriefingModal}
        />
      </Suspense>
    </>
  );
};
