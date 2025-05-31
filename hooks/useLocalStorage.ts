import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for persisting state in localStorage with TypeScript support
 * 
 * @param key The localStorage key to store the value under
 * @param initialValue The default value to use if no value is stored
 * @returns A stateful value and a function to update it, similar to useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    // SSR safety check - don't access localStorage during server-side rendering
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      
      // Parse stored json or return initialValue if none exists
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error (like invalid JSON), return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // SSR safety check before accessing localStorage
      if (typeof window !== 'undefined') {
        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch a custom event so other instances of useLocalStorage
        // with the same key can stay in sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: key,
          newValue: JSON.stringify(valueToStore),
        }));
      }
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes to this localStorage key in other windows/tabs
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Handler for storage events from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          // Update state with new value
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
