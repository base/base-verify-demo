'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

type MiniAppContextType = {
  isInMiniApp: boolean | undefined;
  addMiniAppResult: any | null;
};

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function useMiniAppContext() {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error('useMiniAppContext must be used within MiniAppGuard');
  }
  return context;
}

type MiniAppGuardProps = {
  children: ReactNode;
};

// Constants for mini app prompt throttling
const PROMPT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
const STORAGE_KEY = 'miniapp_last_prompt_timestamp';

/**
 * Check if we should prompt the user to add the mini app
 * Returns true if enough time has passed since the last prompt
 */
function shouldPromptToAdd(): boolean {
  try {
    const lastPrompt = localStorage.getItem(STORAGE_KEY);
    if (!lastPrompt) return true;

    const timeSinceLastPrompt = Date.now() - parseInt(lastPrompt, 10);
    return timeSinceLastPrompt > PROMPT_COOLDOWN_MS;
  } catch (error) {
    // If localStorage is unavailable, allow the prompt
    console.error('Error checking prompt cooldown:', error);
    return true;
  }
}

/**
 * Record that we've shown the add mini app prompt
 */
function recordPromptShown(): void {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error recording prompt timestamp:', error);
  }
}

export function MiniAppGuard({ children }: MiniAppGuardProps) {
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | undefined>(undefined);
  const [isChecking, setIsChecking] = useState(true);
  const [addMiniAppResult, setAddMiniAppResult] = useState<any | null>(null);
  const value = useMemo(() => ({ isInMiniApp, addMiniAppResult }), [isInMiniApp, addMiniAppResult]);

  useEffect(() => {
    const checkMiniAppStatus = async () => {
      try {
        const status = await sdk.isInMiniApp();
        setIsInMiniApp(status);

        // If in mini app, check if user has added it
        if (status) {
          const context = await sdk.context;
          console.log('context', context)
          if (!context.client.added && shouldPromptToAdd()) {
            try {
              const result = await sdk.actions.addMiniApp();
              setAddMiniAppResult(result);
              console.log('addMiniApp result:', result);
              recordPromptShown();
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Error prompting to add mini app:', error);
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error checking mini app status:', error);
        setIsInMiniApp(false);
      } finally {
        setIsChecking(false);
      }
    };

    void checkMiniAppStatus();
  }, []);

  // Don't render until we've checked the mini app status
  if (isChecking) {
    return null;
  }

  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>;
}

