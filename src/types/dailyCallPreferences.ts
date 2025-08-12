export interface DailyCallPreferences {
  enabled: boolean;
  time: string; // e.g., '08:30'
  timezone: string;
  daysOfWeek: number[]; // 0-6
  language?: string;
  voice?: string;
}

