import type { Preview } from '@storybook/react-vite';
import React from 'react';
import '../src/index.css'; // Import Tailwind CSS

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
      config: {
        rules: [
          {
            // Disable color-contrast rule for glassmorphism elements
            id: 'color-contrast',
            enabled: false,
          },
        ],
      },
    },

    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
        {
          name: 'gradient-light',
          value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        {
          name: 'gradient-dark',
          value: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
        },
      ],
    },

    docs: {
      story: {
        inline: true,
      },
    },

    layout: 'centered',
  },

  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';

      // Apply theme class to the story container
      return (
        <div className={`${theme} ${theme === 'dark' ? 'dark' : ''}`}>
          <div className="min-h-screen bg-background text-foreground p-4">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;