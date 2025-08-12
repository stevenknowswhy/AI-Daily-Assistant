/**
 * React Query Provider
 * ===================
 * 
 * Provider component that wraps the application with TanStack Query functionality
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '../../lib/queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a single instance of QueryClient to avoid recreating on every render
const queryClient = createQueryClient();

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};
