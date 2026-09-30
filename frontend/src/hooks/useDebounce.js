import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce any value (e.g. search keyword)
 * @param {any} value The input value
 * @param {number} delay Delay in milliseconds (default: 400ms >= 300ms required)
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
