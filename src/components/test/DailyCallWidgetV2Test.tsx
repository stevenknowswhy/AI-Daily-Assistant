import React from 'react';
import { DailyCallWidgetV2 } from '../dashboard/widgets/DailyCallWidgetV2';

export const DailyCallWidgetV2Test: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Daily Call Widget V2 Test
          </h1>
          <p className="text-gray-600">
            Testing the new Daily Call Preferences component with improved authentication and persistence.
          </p>
        </div>

        {/* Test Instructions */}
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Test Instructions</h2>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>1. Load Test:</strong> The component should automatically load existing preferences on mount.</p>
            <p><strong>2. Authentication:</strong> Watch for authentication status indicators and console logs.</p>
            <p><strong>3. Phone Number Input:</strong> Enter a phone number and verify it persists after saving.</p>
            <p><strong>4. Error Handling:</strong> Check that errors are displayed clearly if they occur.</p>
            <p><strong>5. Refresh Test:</strong> After saving, refresh the page to verify persistence.</p>
          </div>
        </div>

        {/* Component Under Test */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Call Widget V2</h2>
          <DailyCallWidgetV2 userId="user_314M04o2MAC2IWgqNsdMK9AT7Kw" />
        </div>

        {/* Test Results Section */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Expected Behavior</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Component mounts and immediately starts authentication</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Authentication succeeds and "Authenticated" indicator appears</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Existing phone number loads from database (if any)</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Phone number input accepts user input</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Save button works and shows success message</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Phone number persists after page refresh</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Console logs show detailed debugging information</span>
            </div>
          </div>
        </div>

        {/* Console Logs Section */}
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Console Logs to Watch For</h2>
          <div className="text-xs font-mono text-gray-700 space-y-1">
            <div>🔄 [V2] DailyCallWidgetV2 mounted, loading preferences...</div>
            <div>🔐 [V2] Starting Bills/Supabase authentication...</div>
            <div>✅ [V2] Bills/Supabase authentication successful</div>
            <div>📞 [V2] Loading daily call preferences for user: user_314M04o2MAC2IWgqNsdMK9AT7Kw</div>
            <div>✅ [V2] Setting phone number from API: [phone_number]</div>
            <div>📱 [V2] Phone number changed: [new_value]</div>
            <div>💾 [V2] Saving daily call preferences...</div>
            <div>✅ [V2] Preferences saved successfully</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyCallWidgetV2Test;
