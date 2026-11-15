import { useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Executes a buttery-smooth GSAP entrance animation for modal overlays and cards.
 * Uses GSAP when available, with a hardware-accelerated cubic-bezier Web Animations API fallback.
 */
export function animateModalEntrance(overlay: HTMLElement, content: HTMLElement) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gsap = (window as any).gsap;
  if (gsap && gsap.fromTo) {
    try {
      gsap.fromTo(
        overlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
      gsap.fromTo(
        content,
        {
          opacity: 0,
          scale: 0.94,
          y: 18,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.32,
          ease: 'power3.out',
        }
      );
      return;
    } catch {
      // Fall through to native high-performance Web Animations API
    }
  }

  // Native 60fps compositor animation with Apple/Linear-style spring curve
  overlay.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
  );

  content.animate(
    [
      { opacity: 0, transform: 'scale(0.94) translateY(18px)' },
      { opacity: 1, transform: 'scale(1) translateY(0)' },
    ],
    { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
  );
}

/**
 * Executes a smooth exit animation before unmounting, preventing all flashes and flickers.
 */
export function animateModalExit(
  overlay: HTMLElement,
  content: HTMLElement,
  onComplete: () => void
) {
  if (typeof window === 'undefined') {
    onComplete();
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onComplete();
    return;
  }

  const gsap = (window as any).gsap;
  if (gsap && gsap.to) {
    try {
      gsap.to(overlay, { opacity: 0, duration: 0.16, ease: 'power2.in' });
      gsap.to(content, {
        opacity: 0,
        scale: 0.95,
        y: 12,
        duration: 0.16,
        ease: 'power2.in',
        onComplete,
      });
      return;
    } catch {
      // Fall through to native Web Animations API
    }
  }

  // Native WAAPI exit
  overlay.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 160, easing: 'ease-in', fill: 'forwards' }
  );
  const anim = content.animate(
    [
      { opacity: 1, transform: 'scale(1) translateY(0)' },
      { opacity: 0, transform: 'scale(0.95) translateY(12px)' },
    ],
    { duration: 160, easing: 'ease-in', fill: 'forwards' }
  );
  anim.onfinish = onComplete;
}

/**
 * Premium GSAP Modal Hook
 * - useLayoutEffect prevents 1-frame paint flash on open.
 * - requestClose provides an animated exit before notifying the parent.
 */
export function useGsapModal(isOpen: boolean, onClose?: () => void) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  useLayoutEffect(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      return;
    }

    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    animateModalEntrance(overlay, content);
  }, [isOpen]);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content || !onClose) {
      if (onClose) onClose();
      return;
    }

    animateModalExit(overlay, content, () => {
      onClose();
      isClosingRef.current = false;
    });
  }, [onClose]);

  return { overlayRef, contentRef, requestClose };
}
