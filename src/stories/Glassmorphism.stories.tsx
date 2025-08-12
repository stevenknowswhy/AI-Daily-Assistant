import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';

const meta = {
  title: 'Design System/Glassmorphism',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Showcase of glassmorphism design patterns used throughout the AI Daily Assistant.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightGradientBackground: Story = {
  parameters: {
    backgrounds: { default: 'gradient-light' },
  },
  render: () => (
    <div className="min-h-screen p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Glassmorphism Showcase</h1>
        <p className="text-white/80">Light gradient background</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Glass Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Basic Glass Card</CardTitle>
            <CardDescription className="text-white/80">
              Simple glassmorphism effect
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/90">
              This card demonstrates the basic glassmorphism effect with 10% white background, 
              backdrop blur, and subtle borders.
            </p>
          </CardContent>
        </Card>

        {/* Interactive Glass Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <CardHeader>
            <CardTitle className="text-white">Interactive Card</CardTitle>
            <CardDescription className="text-white/80">
              Hover for effect
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/90">
              This card has hover effects that increase the background opacity.
            </p>
          </CardContent>
        </Card>

        {/* Form Glass Card */}
        <Card className="bg-white/15 backdrop-blur-lg border-white/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Glass Form</CardTitle>
            <CardDescription className="text-white/80">
              Form with glass styling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input 
                type="email" 
                placeholder="your@email.com"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/25"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="notifications" />
              <Label htmlFor="notifications" className="text-white">Notifications</Label>
            </div>
            <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30">
              Submit
            </Button>
          </CardContent>
        </Card>

        {/* Dashboard Widget Style */}
        <Card className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              📊 Dashboard Widget
            </CardTitle>
            <CardDescription className="text-white/80">
              Widget-style glass card
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/90">Active Users</span>
                <span className="text-white font-semibold">1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/90">Revenue</span>
                <span className="text-white font-semibold">$12,345</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white/60 h-2 rounded-full w-3/4"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Minimal Glass */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">Minimal Glass</h3>
              <p className="text-sm text-white/70 mt-2">
                Very subtle glassmorphism
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Strong Glass */}
        <Card className="bg-white/25 backdrop-blur-xl border-white/40 shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">Strong Glass</h3>
              <p className="text-sm text-white/80 mt-2">
                More pronounced effect
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
};

export const DarkGradientBackground: Story = {
  parameters: {
    backgrounds: { default: 'gradient-dark' },
  },
  render: () => (
    <div className="min-h-screen p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dark Glassmorphism</h1>
        <p className="text-white/70">Dark gradient background</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dark Glass Card */}
        <Card className="bg-black/20 backdrop-blur-md border-white/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Dark Glass</CardTitle>
            <CardDescription className="text-white/70">
              Black overlay with blur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/80">
              Using black overlay instead of white for darker backgrounds.
            </p>
          </CardContent>
        </Card>

        {/* Mixed Glass */}
        <Card className="bg-gradient-to-br from-black/30 to-white/10 backdrop-blur-lg border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Mixed Glass</CardTitle>
            <CardDescription className="text-white/70">
              Gradient overlay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/80">
              Combining black and white overlays for depth.
            </p>
          </CardContent>
        </Card>

        {/* Colored Glass */}
        <Card className="bg-blue-500/20 backdrop-blur-md border-blue-300/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Colored Glass</CardTitle>
            <CardDescription className="text-white/70">
              Blue tinted glass
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/80">
              Adding color tints to the glass effect.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
};

export const ComponentShowcase: Story = {
  parameters: {
    backgrounds: { default: 'gradient-light' },
  },
  render: () => (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Glass Components</h1>
          <p className="text-white/80">All components with glassmorphism styling</p>
        </div>

        {/* Navigation Bar */}
        <nav className="bg-white/10 backdrop-blur-md border-white/20 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">AI Daily Assistant</h2>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-white hover:bg-white/20">
                Dashboard
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/20">
                Settings
              </Button>
              <Button className="bg-white/20 hover:bg-white/30 text-white">
                Profile
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white justify-start">
                  📞 Test Call
                </Button>
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white justify-start">
                  📧 Check Emails
                </Button>
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white justify-start">
                  📅 View Calendar
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/15 backdrop-blur-md border-white/30 shadow-xl">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">24</div>
                    <div className="text-white/80">Calls This Month</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/15 backdrop-blur-md border-white/30 shadow-xl">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">98%</div>
                    <div className="text-white/80">Success Rate</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Panel */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Call Preferences</CardTitle>
                <CardDescription className="text-white/80">
                  Configure your daily briefing settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Phone Number</Label>
                  <Input 
                    type="tel" 
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Enable Daily Calls</Label>
                    <p className="text-sm text-white/70">Receive automated briefings</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  ),
};
