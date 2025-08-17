import { useEffect, useState } from 'react';
import { key } from '../lib/constants';

export function usePersistentState(initialValue) {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || initialValue; } catch { return initialValue; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [state]);
  return [state, setState];
}
