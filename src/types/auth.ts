export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    callTime: string;
    timezone: string;
  };
}

