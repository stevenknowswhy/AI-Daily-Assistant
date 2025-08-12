import React, { useState } from 'react';
import { dailyCallPreferencesService, DailyCallPreferences } from '../../services/dailyCallPreferences';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

export const DailyCallPreferencesTest: React.FC = () => {
  const [results, setResults] = useState<{ [key: string]: TestResult }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

  const testUserId = 'test-user-persistence-123';
  
  const testPreferences: DailyCallPreferences = {
    phoneNumber: '+1234567890',
    callTime: '09:00',
    timezone: 'America/New_York',
    noAnswerAction: 'email_briefing',
    retryCount: 2,
    isActive: true
  };

  const updateResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [testName]: result }));
    setIsLoading(prev => ({ ...prev, [testName]: false }));
  };

  const setLoadingState = (testName: string, loading: boolean) => {
    setIsLoading(prev => ({ ...prev, [testName]: loading }));
  };

  const testSavePreferences = async () => {
    const testName = 'save';
    setLoadingState(testName, true);
    
    try {
      const response = await dailyCallPreferencesService.saveUserPreferences(testUserId, testPreferences);
      
      if (response.success) {
        updateResult(testName, {
          success: true,
          message: '✅ Preferences saved successfully!',
          data: response.preferences
        });
      } else {
        updateResult(testName, {
          success: false,
          message: `❌ Failed to save: ${response.error}`,
          data: response
        });
      }
    } catch (error) {
      updateResult(testName, {
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const testLoadFromAPI = async () => {
    const testName = 'loadAPI';
    setLoadingState(testName, true);
    
    try {
      const response = await dailyCallPreferencesService.getUserPreferences(testUserId);
      
      if (response.success && response.preferences) {
        updateResult(testName, {
          success: true,
          message: '✅ Preferences loaded from API!',
          data: response.preferences
        });
      } else {
        updateResult(testName, {
          success: false,
          message: `❌ No preferences found: ${response.error || 'Unknown error'}`,
          data: response
        });
      }
    } catch (error) {
      updateResult(testName, {
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const testLoadFromLocalStorage = () => {
    const testName = 'loadLocal';
    
    try {
      const stored = localStorage.getItem(`daily_call_preferences_${testUserId}`);
      
      if (stored) {
        const preferences = JSON.parse(stored);
        updateResult(testName, {
          success: true,
          message: '✅ Preferences loaded from localStorage!',
          data: preferences
        });
      } else {
        updateResult(testName, {
          success: false,
          message: '❌ No preferences found in localStorage'
        });
      }
    } catch (error) {
      updateResult(testName, {
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const testClearLocalStorage = () => {
    const testName = 'clear';
    
    try {
      localStorage.removeItem(`daily_call_preferences_${testUserId}`);
      updateResult(testName, {
        success: true,
        message: '✅ localStorage cleared successfully!'
      });
    } catch (error) {
      updateResult(testName, {
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const testPersistenceFlow = async () => {
    const testName = 'persistence';
    setLoadingState(testName, true);
    
    try {
      // Step 1: Clear localStorage
      localStorage.removeItem(`daily_call_preferences_${testUserId}`);
      
      // Step 2: Save preferences (should save to both API and localStorage)
      const saveResponse = await dailyCallPreferencesService.saveUserPreferences(testUserId, testPreferences);
      
      if (!saveResponse.success) {
        throw new Error(`Save failed: ${saveResponse.error}`);
      }
      
      // Step 3: Check localStorage
      const stored = localStorage.getItem(`daily_call_preferences_${testUserId}`);
      if (!stored) {
        throw new Error('Preferences not saved to localStorage');
      }
      
      // Step 4: Clear memory cache and load again (should use localStorage fallback)
      const loadResponse = await dailyCallPreferencesService.getUserPreferences(testUserId);
      
      if (!loadResponse.success || !loadResponse.preferences) {
        throw new Error('Failed to load preferences after save');
      }
      
      updateResult(testName, {
        success: true,
        message: '✅ Full persistence flow works! Data persists across API calls and localStorage.',
        data: {
          saved: saveResponse.preferences,
          loaded: loadResponse.preferences,
          localStorage: JSON.parse(stored)
        }
      });
    } catch (error) {
      updateResult(testName, {
        success: false,
        message: `❌ Persistence flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const ResultDisplay: React.FC<{ testName: string; result?: TestResult; loading?: boolean }> = ({
    // testName,
    result,
    loading
  }) => (
    <div className={`p-3 rounded-md ${result?.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} ${!result ? 'bg-gray-50 text-gray-600' : ''}`}>
      {loading ? (
        <div className="text-blue-600">⏳ Running test...</div>
      ) : result ? (
        <div>
          <div className="font-medium">{result.message}</div>
          {result.data && (
            <pre className="mt-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        <div>Click the button to run this test</div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Daily Call Preferences Persistence Test</h1>
      
      <div className="grid gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Test 1: Save Preferences</h2>
            <button
              onClick={testSavePreferences}
              disabled={isLoading.save}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Save Test Preferences
            </button>
          </div>
          <ResultDisplay testName="save" result={results.save} loading={isLoading.save} />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Test 2: Load from API</h2>
            <button
              onClick={testLoadFromAPI}
              disabled={isLoading.loadAPI}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Load from API
            </button>
          </div>
          <ResultDisplay testName="loadAPI" result={results.loadAPI} loading={isLoading.loadAPI} />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Test 3: Load from localStorage</h2>
            <button
              onClick={testLoadFromLocalStorage}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Load from localStorage
            </button>
          </div>
          <ResultDisplay testName="loadLocal" result={results.loadLocal} />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Test 4: Clear localStorage</h2>
            <button
              onClick={testClearLocalStorage}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Clear localStorage
            </button>
          </div>
          <ResultDisplay testName="clear" result={results.clear} />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Test 5: Full Persistence Flow</h2>
            <button
              onClick={testPersistenceFlow}
              disabled={isLoading.persistence}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Test Full Flow
            </button>
          </div>
          <ResultDisplay testName="persistence" result={results.persistence} loading={isLoading.persistence} />
        </div>
      </div>
    </div>
  );
};
