import { useEffect } from 'react';

/**
 * Attaches an IntersectionObserver to every element with
 * the classes: reveal | reveal-left | reveal-right | reveal-scale
 * Adds `.visible` when the element enters the viewport.
 */
export const useScrollReveal = () => {
    useEffect(() => {
        const targets = document.querySelectorAll<HTMLElement>(
            '.reveal, .reveal-left, .reveal-right, .reveal-scale'
        );

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target); // trigger once
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        targets.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);
};
