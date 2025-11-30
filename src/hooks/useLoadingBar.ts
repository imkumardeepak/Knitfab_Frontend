import { useRef, useCallback } from 'react';
import type { LoadingBarRef } from 'react-top-loading-bar';

export const useLoadingBar = () => {
  const ref = useRef<LoadingBarRef>(null);

  const handleStart = useCallback(() => {
    ref.current?.continuousStart(0, 10);
  }, []);

  const handleComplete = useCallback(() => {
    ref.current?.complete();
  }, []);

  return { ref, handleStart, handleComplete };
};