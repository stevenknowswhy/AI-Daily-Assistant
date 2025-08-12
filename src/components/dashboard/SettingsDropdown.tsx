import React, { Suspense, useState, lazy } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
const SettingsModal = lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));

interface SettingsDropdownProps {
  connectionStatus: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
    phone: boolean;
  };
  onAuthenticateCalendar: () => void;
  onAuthenticateGmail: () => void;
  onAuthenticateBills: () => void;
  onSignOutAllServices: () => void;
  isSigningOut: boolean;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  connectionStatus,
  onAuthenticateCalendar,
  onAuthenticateGmail,
  onAuthenticateBills,
  onSignOutAllServices,
  isSigningOut
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsModalOpen(true)}
        className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      </Button>

      <Suspense fallback={null}>
        <SettingsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          connectionStatus={connectionStatus}
          onAuthenticateCalendar={onAuthenticateCalendar}
          onAuthenticateGmail={onAuthenticateGmail}
          onAuthenticateBills={onAuthenticateBills}
          onSignOutAllServices={onSignOutAllServices}
          isSigningOut={isSigningOut}
        />
      </Suspense>
    </>
  );
};
