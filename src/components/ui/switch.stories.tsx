import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Switch } from './switch';
import { Label } from './label';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A toggle switch component for boolean settings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: { type: 'boolean' },
      description: 'Whether the switch is checked',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the switch is disabled',
    },
    onCheckedChange: {
      action: 'checked changed',
      description: 'Callback when the checked state changes',
    },
  },
  args: { onCheckedChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" {...args} />
      <Label htmlFor="airplane-mode">Airplane mode</Label>
    </div>
  ),
  args: {
    checked: false,
  },
};

export const SettingsExample: Story = {
  render: () => (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Settings</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications" className="text-sm font-medium">
              Push Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Receive notifications on your device
            </p>
          </div>
          <Switch id="notifications" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="marketing" className="text-sm font-medium">
              Marketing Emails
            </Label>
            <p className="text-xs text-muted-foreground">
              Receive emails about new features
            </p>
          </div>
          <Switch id="marketing" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="analytics" className="text-sm font-medium">
              Analytics
            </Label>
            <p className="text-xs text-muted-foreground">
              Help us improve by sharing usage data
            </p>
          </div>
          <Switch id="analytics" defaultChecked />
        </div>
      </div>
    </div>
  ),
};

export const DailyCallExample: Story = {
  render: () => (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg max-w-md">
      <div>
        <Label className="text-sm font-medium text-gray-900 dark:text-foreground">
          Your AI Assistant calls you
        </Label>
        <p className="text-xs text-gray-600 dark:text-muted-foreground">
          Automatic daily briefing calls
        </p>
      </div>
      <Switch defaultChecked aria-label="Enable daily calls" />
    </div>
  ),
};
