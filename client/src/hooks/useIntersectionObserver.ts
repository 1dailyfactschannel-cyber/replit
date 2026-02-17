import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook to observe when an element enters the viewport
 * Useful for lazy loading content as the user scrolls
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<T | null>, boolean] {
  const { threshold = 0, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isIntersecting];
}

/**
 * Hook for lazy loading data when element comes into view
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement | null>, T | undefined, boolean, Error | undefined] {
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>(options);
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (isIntersecting && !hasLoaded.current) {
      hasLoaded.current = true;
      setIsLoading(true);
      loadFn()
        .then(setData)
        .catch(setError)
        .finally(() => setIsLoading(false));
    }
  }, [isIntersecting, loadFn]);

  return [ref, data, isLoading, error];
}
