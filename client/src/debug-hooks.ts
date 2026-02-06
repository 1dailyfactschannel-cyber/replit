import { useEffect, useRef, useState } from 'react';

// Хук для отслеживания количества рендеров компонента
export function useRenderCount(componentName: string) {
  const count = useRef(0);
  count.current++;
  
  console.log(`[${componentName}] Render count:`, count.current);
  
  // Сброс счетчика при размонтировании
  useEffect(() => {
    return () => {
      console.log(`[${componentName}] Component unmounted after ${count.current} renders`);
    };
  }, [componentName]);
  
  return count.current;
}

// Хук для отслеживания изменений пропсов
export function usePropChanges<T extends Record<string, any>>(props: T, componentName: string) {
  const prevProps = useRef<T>(props);
  
  useEffect(() => {
    const changes: string[] = [];
    
    Object.keys(props).forEach(key => {
      const typedKey = key as keyof T;
      if (prevProps.current[typedKey] !== props[typedKey]) {
        changes.push(`${String(typedKey)}: ${JSON.stringify(prevProps.current[typedKey])} -> ${JSON.stringify(props[typedKey])}`);
      }
    });
    
    if (changes.length > 0) {
      console.log(`[${componentName}] Props changed:`, changes.join(', '));
    }
    
    prevProps.current = props;
  }, [props, componentName]);
}

// Хук для отслеживания вызовов useEffect
export function useDebugEffect(effect: React.EffectCallback, deps: React.DependencyList, hookName: string) {
  const callCount = useRef(0);
  callCount.current++;
  
  console.log(`[${hookName}] Effect triggered, call #${callCount.current}, dependencies:`, deps);
  
  useEffect(() => {
    const cleanup = effect();
    console.log(`[${hookName}] Effect executed, call #${callCount.current}`);
    
    return () => {
      console.log(`[${hookName}] Cleanup executed, call #${callCount.current}`);
      if (cleanup) cleanup();
    };
  }, deps);
}

// Хук для отслеживания состояния и его изменений
export function useDebugState<T>(initialState: T, stateName: string) {
  const [state, setState] = useState(initialState);
  const prevState = useRef(state);
  
  useEffect(() => {
    if (prevState.current !== state) {
      console.log(`[${stateName}] State changed:`, prevState.current, '->', state);
      prevState.current = state;
    }
  }, [state, stateName]);
  
  const debugSetState = (newState: T | ((prevState: T) => T)) => {
    console.log(`[${stateName}] setState called with:`, newState);
    setState(newState);
  };
  
  return [state, debugSetState] as const;
}

// Глобальный мониторинг ошибок React
export function setupGlobalErrorMonitoring() {
  // Отслеживание ошибок в компонентах
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Проверяем, является ли это ошибкой React о максимальной глубине обновлений
    const errorMessage = args.join(' ');
    if (errorMessage.includes('Maximum update depth exceeded')) {
      console.group('=== REACT INFINITE LOOP DETECTED ===');
      console.error('Stack trace:', new Error().stack);
      console.error('Error details:', ...args);
      console.groupEnd();
    }
    return originalConsoleError.apply(console, args);
  };
  
  // Мониторинг всех console.warn для отслеживания предупреждений о refs
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const warningMessage = args.join(' ');
    if (warningMessage.includes('ref') || warningMessage.includes('compose-refs')) {
      console.group('=== REF WARNING DETECTED ===');
      console.warn('Warning details:', ...args);
      console.warn('Stack trace:', new Error().stack);
      console.groupEnd();
    }
    return originalConsoleWarn.apply(console, args);
  };
}