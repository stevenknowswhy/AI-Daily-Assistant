/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src")
      },
      {
        find: "@/components",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/components")
      },
      {
        find: "@/contexts",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/contexts")
      },
      {
        find: "@/lib",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/lib")
      },
      {
        find: "@/hooks",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/hooks")
      },
      {
        find: "@/features",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/features")
      }
    ]
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'twilio-openrouter-voice/**'],
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Core vendor libraries
          if (id.includes('/react/') || id.includes('react-dom')) return 'vendor-react';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('react-router-dom')) return 'vendor-router';
          if (id.includes('@clerk')) return 'vendor-clerk';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('react-hot-toast')) return 'vendor-hot-toast';
          if (id.includes('html2canvas')) return 'vendor-html2canvas';
          if (id.includes('jspdf')) return 'vendor-jspdf';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) return 'vendor-utils';

          // App chunks
          if (id.includes('AuthContext') || id.includes('components/auth/')) return 'auth';
          if (id.includes('OnboardingContext') || id.includes('components/modern/') || id.includes('components/gamified/')) return 'onboarding';
          if (id.includes('components/jarvis/')) return 'jarvis';
          if (id.includes('components/dashboard/widgets/')) return 'dashboard-widgets';
          if (id.includes('components/dashboard/')) return 'dashboard-core';
          if (id.includes('components/ui/')) return 'ui-components';

          // Keep tests separate if ever included
          if (id.includes('/tests/')) return 'tests';
        }
      }
    },
    // Reduce chunk size warning limit
    chunkSizeWarningLimit: 500
  }
});