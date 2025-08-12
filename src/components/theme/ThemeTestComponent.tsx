import React from 'react';
import { Sun, Moon, Settings, Calendar, Mail, LogOut, User, Loader2, DollarSign, RefreshCw, X, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useTheme } from '../providers/ModernThemeProvider';

/**
 * Theme Test Component - Used to verify all UI elements are properly themed
 * This component displays all the icons and text elements used in the dashboard
 * to ensure they respond correctly to theme changes.
 */
export const ThemeTestComponent: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 space-y-6 bg-background text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Theme Test Component</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-gray-700 dark:text-gray-300" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-gray-700 dark:text-gray-300" />
        </Button>
      </div>

      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Icon Theme Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Icons */}
          <div className="flex items-center space-x-4">
            <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <span className="text-sm text-gray-900 dark:text-gray-100">Settings Icon</span>
          </div>

          {/* Service Icons */}
          <div className="flex items-center space-x-4">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-900 dark:text-gray-100">Calendar Icon</span>
          </div>

          <div className="flex items-center space-x-4">
            <Mail className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-gray-900 dark:text-gray-100">Mail Icon</span>
          </div>

          <div className="flex items-center space-x-4">
            <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-gray-900 dark:text-gray-100">Bills Icon</span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-4">
            <LogOut className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Sign Out Icon</span>
          </div>

          <div className="flex items-center space-x-4">
            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">User Icon</span>
          </div>

          {/* Loading Icons */}
          <div className="flex items-center space-x-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading Icon</span>
          </div>

          <div className="flex items-center space-x-4">
            <RefreshCw className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Refresh Icon</span>
          </div>

          {/* Modal Icons */}
          <div className="flex items-center space-x-4">
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Close Icon</span>
          </div>

          <div className="flex items-center space-x-4">
            <Plus className="h-4 w-4 text-white" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Add Icon (on colored background)</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Button Theme Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default Button</Button>
            <Button variant="outline" className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              Outline Button
            </Button>
            <Button variant="ghost" className="text-gray-700 dark:text-gray-300">
              Ghost Button
            </Button>
            <Button variant="secondary">Secondary Button</Button>
          </div>

          {/* Sign Out Button Test */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sign Out Button Test</h4>
            <div className="space-y-2 max-w-xs">
              <button
                type="button"
                className="w-full flex items-center justify-start px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 bg-transparent rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <LogOut className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Sign Out of All Services
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-start px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 bg-transparent rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <User className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Sign Out of App
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Text Theme Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Primary Text</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">Secondary Text</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tertiary Text</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Muted Text</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Subtle Text</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Background Theme Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-900 dark:text-gray-100">Card Background</span>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <span className="text-sm text-gray-900 dark:text-gray-100">Modal Background</span>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current theme: <span className="font-semibold text-gray-900 dark:text-gray-100">{theme}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Toggle the theme button above to test all elements in both light and dark modes
        </p>
      </div>
    </div>
  );
};

export default ThemeTestComponent;
