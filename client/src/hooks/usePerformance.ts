import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    
    if (renderCount.current === 1) {
      console.log(`[Performance] ${componentName} - Initial render: ${endTime.toFixed(2)}ms`);
    } else {
      console.log(`[Performance] ${componentName} - Render #${renderCount.current}: ${endTime.toFixed(2)}ms`);
    }
  });

  return renderCount.current;
}

// Utility to measure function execution time
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.log(`[Performance] ${name} - Execution time: ${(end - start).toFixed(2)}ms`);
    return result;
  }) as T;
}
