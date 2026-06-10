import { useEffect, useRef } from 'react';

export const useFocusTrap = (isOpen: boolean) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastFocusedElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            lastFocusedElement.current = document.activeElement as HTMLElement;
            const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];

            firstElement?.focus();

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement?.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement?.focus();
                        }
                    }
                }
            };

            const container = containerRef.current;
            container?.addEventListener('keydown', handleKeyDown);

            return () => {
                container?.removeEventListener('keydown', handleKeyDown);
                lastFocusedElement.current?.focus();
            };
        }
    }, [isOpen]);

    return containerRef;
};
