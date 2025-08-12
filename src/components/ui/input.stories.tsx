import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible input component for forms and user input.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'The input type',
    },
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the input is disabled',
    },
    value: {
      control: { type: 'text' },
      description: 'The input value',
    },
  },
  args: { onChange: fn() },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithValue: Story = {
  args: {
    value: 'Hello World',
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email...',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password...',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

export const Phone: Story = {
  args: {
    type: 'tel',
    placeholder: '+1 (555) 123-4567',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
    value: 'Cannot edit this',
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" {...args} />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email-error">Email</Label>
      <Input 
        type="email" 
        id="email-error" 
        placeholder="Email" 
        className="border-red-500 focus:border-red-500 focus:ring-red-500"
      />
      <p className="text-sm text-red-500">Please enter a valid email address.</p>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Contact Form</h3>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Your name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-form">Email</Label>
        <Input id="email-form" type="email" placeholder="your@email.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone-form">Phone</Label>
        <Input id="phone-form" type="tel" placeholder="+1 (555) 123-4567" />
      </div>
      <Button className="w-full">Submit</Button>
    </div>
  ),
};

export const SearchInput: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <Input 
        type="search" 
        placeholder="Search..." 
        className="pl-10"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  ),
};

export const DailyCallPhoneInput: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-sm">
      <Label className="block text-sm font-medium text-foreground">
        Phone Number
      </Label>
      <Input
        type="tel"
        placeholder="+1 (555) 123-4567"
        className="w-full px-3 py-2 bg-background/60 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
      />
      <p className="text-xs text-muted-foreground">
        Enter your phone number for daily briefing calls
      </p>
    </div>
  ),
};
