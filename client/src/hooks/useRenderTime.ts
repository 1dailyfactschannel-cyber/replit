import { useEffect, useRef } from 'react';

interface UseRenderTimeOptions {
  componentName: string;
  threshold?: number; // milliseconds
}

export function useRenderTime({ componentName, threshold = 100 }: UseRenderTimeOptions) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    
    if (duration > threshold) {
      console.warn(`[Performance] ${componentName} - Slow render #${renderCount.current}: ${duration.toFixed(2)}ms`);
    } else {
      console.log(`[Performance] ${componentName} - Render #${renderCount.current}: ${duration.toFixed(2)}ms`);
    }
  });

  startTime.current = performance.now();
}

export function useMountTime(componentName: string) {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime.current;
    console.log(`[Performance] ${componentName} - Mount time: ${duration.toFixed(2)}ms`);
  }, [componentName]);
}
