import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DailyCallWidgetV2 } from './DailyCallWidgetV2';

// Create a mock QueryClient for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

// Mock the hooks
const mockPreferencesData = {
  preferences: {
    enabled: true,
    phoneNumber: '+1234567890',
    time: '08:00',
    timezone: 'America/Los_Angeles',
    voice: 'alloy' as const,
    includeCalendar: true,
    includeEmails: true,
    includeBills: true,
    weekdays: [true, true, true, true, true, false, false],
  },
};

const meta = {
  title: 'Dashboard/DailyCallWidgetV2',
  component: DailyCallWidgetV2,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'The main daily call configuration widget with glassmorphism design.',
      },
    },
    backgrounds: {
      default: 'gradient-light',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-[400px] p-4">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  argTypes: {
    userId: {
      control: { type: 'text' },
      description: 'User ID for the widget',
    },
  },
  args: {
    userId: 'user_314M04o2MAC2IWgqNsdMK9AT7Kw',
  },
} satisfies Meta<typeof DailyCallWidgetV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock the API hooks before stories
const mockHooks = () => {
  // Mock useDailyCallPreferences
  jest.mock('../../../hooks/queries', () => ({
    useDailyCallPreferences: () => ({
      data: mockPreferencesData,
      isLoading: false,
      error: null,
      refetch: fn(),
    }),
    useUpdateDailyCallPreferences: () => ({
      mutateAsync: fn(),
      isPending: false,
    }),
    useTestDailyCall: () => ({
      mutateAsync: fn(),
      isPending: false,
    }),
  }));
};

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        // Mock API responses
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        // Mock loading state
      ],
    },
  },
  render: (args) => {
    // Override the hook to return loading state
    const LoadingWidget = () => (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded mb-4"></div>
          <div className="h-4 bg-white/20 rounded mb-2"></div>
          <div className="h-4 bg-white/20 rounded w-3/4"></div>
        </div>
      </div>
    );
    return <LoadingWidget />;
  },
};

export const EditMode: Story = {
  render: (args) => {
    // This would show the edit mode state
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Phone Number
            </label>
            <input
              type="tel"
              value="+1234567890"
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/50 focus:border-transparent"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Daily Briefing Time
            </label>
            <select
              value="08:00"
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-transparent"
            >
              <option value="07:00">7:00 AM</option>
              <option value="08:00">8:00 AM</option>
              <option value="09:00">9:00 AM</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Voice
            </label>
            <select
              value="alloy"
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-transparent"
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
              Save Changes
            </button>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl opacity-75">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Daily Call</h3>
          <p className="text-sm text-white/80">Disabled</p>
        </div>
        <div className="w-10 h-6 bg-white/20 rounded-full"></div>
      </div>
      <p className="text-white/70 text-sm">
        Daily calls are currently disabled. Enable to receive automated briefings.
      </p>
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'gradient-dark' },
  },
  render: (args) => (
    <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Daily Call</h3>
          <p className="text-sm text-white/70">8:00 AM • +1234567890</p>
        </div>
        <div className="w-10 h-6 bg-blue-500 rounded-full relative">
          <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
          Edit
        </button>
        <button className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
          Test Call
        </button>
      </div>
    </div>
  ),
};

export const CompactView: Story = {
  render: (args) => (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 shadow-lg max-w-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-white">Daily Call</h4>
          <p className="text-xs text-white/80">8:00 AM</p>
        </div>
        <div className="w-8 h-5 bg-blue-500 rounded-full relative">
          <div className="w-3 h-3 bg-white rounded-full absolute top-1 right-1"></div>
        </div>
      </div>
    </div>
  ),
};
