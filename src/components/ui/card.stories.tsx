import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component with glassmorphism design support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the card content area where you can place any content.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const Glassmorphism: Story = {
  parameters: {
    backgrounds: { default: 'gradient-light' },
  },
  render: () => (
    <Card className="w-[350px] bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="text-white">Glassmorphism Card</CardTitle>
        <CardDescription className="text-white/80">
          A beautiful glass-like card with backdrop blur
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/90">
          This card demonstrates the glassmorphism design with transparency, 
          backdrop blur, and subtle borders.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
          Cancel
        </Button>
        <Button className="bg-white/20 text-white hover:bg-white/30">
          Deploy
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const GlassmorphismDark: Story = {
  parameters: {
    backgrounds: { default: 'gradient-dark' },
  },
  render: () => (
    <Card className="w-[350px] bg-black/20 backdrop-blur-md border-white/10 shadow-xl">
      <CardHeader>
        <CardTitle className="text-white">Dark Glassmorphism</CardTitle>
        <CardDescription className="text-white/70">
          Dark variant with subtle transparency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/80">
          Perfect for dark themes and gradient backgrounds.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
          Cancel
        </Button>
        <Button className="bg-white/10 text-white hover:bg-white/20">
          Deploy
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const DashboardWidget: Story = {
  parameters: {
    backgrounds: { default: 'light' },
  },
  render: () => (
    <Card className="w-[350px] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
          📊 Dashboard Widget
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Example dashboard widget styling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">Active Users</span>
            <span className="font-semibold text-blue-900 dark:text-blue-100">1,234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">Revenue</span>
            <span className="font-semibold text-blue-900 dark:text-blue-100">$12,345</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          View Details
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const MinimalCard: Story = {
  render: () => (
    <Card className="w-[300px] border-0 shadow-sm">
      <CardContent className="pt-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Minimal Design</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Clean and simple card without borders
          </p>
        </div>
      </CardContent>
    </Card>
  ),
};

export const InteractiveCard: Story = {
  render: () => (
    <Card className="w-[350px] hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Hover to see the effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has hover effects and could be clickable.</p>
      </CardContent>
    </Card>
  ),
};
