
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useUser } from '@/firebase';
import { logUserActivity as logToServer } from './activity-logger';

// Type for a single log entry in the session
interface SessionLog {
  message: string;
  timestamp: number;
}

// Type for the context state and methods
interface ActivityLogContextType {
  sessionLogs: SessionLog[];
  logSessionActivity: (message: string, details?: Record<string, any>) => void;
  clearSessionLogs: () => void;
}

// Create the context with a default undefined value
const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

// Provider component
export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const { user, userProfile, userRole } = useUser();

  const logSessionActivity = useCallback(
    (message: string, details: Record<string, any> = {}) => {
      // 1. Add to the client-side session log for immediate UI feedback
      const newLog: SessionLog = { message, timestamp: Date.now() };
      setSessionLogs(prevLogs => [...prevLogs, newLog]);

      // 2. Persist to the permanent server-side log
      if (user?.uid && userProfile && userRole) {
        const action = details.action || 'user_action'; 
        const userName = `${userProfile.firstName} ${userProfile.lastName}`;

        logToServer(user.uid, userName, userRole, action, details).catch(error => {
          console.error("Failed to persist activity log to server:", error);
          // Optionally, handle this error, e.g., with a toast notification
        });
      }
    },
    [user, userProfile, userRole] // Dependency on the user object to ensure we have the UID
  );

  const clearSessionLogs = () => {
    setSessionLogs([]);
  };

  const value = { sessionLogs, logSessionActivity, clearSessionLogs };

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
};

// Custom hook to use the activity log context
export const useSessionActivity = () => {
  const context = useContext(ActivityLogContext);
  if (context === undefined) {
    throw new Error('useSessionActivity must be used within an ActivityLogProvider');
  }
  return context;
};
