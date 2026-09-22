import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EXPLORE_TOUR_ITEMS, ExploreTourItem } from './exploreTourData';
import { weatherSynth } from '../../utils/audio';

const STORAGE_KEY_SEEN = 'samvartaka_explore_tour_seen_ids';
const STORAGE_KEY_MODE = 'samvartaka_explore_tour_mode_active';

interface ExploreTourContextType {
  isExploreMode: boolean;
  seenIds: Set<string>;
  totalCount: number;
  exploredCount: number;
  activeItem: ExploreTourItem | null;
  activeAnchorRect: DOMRect | null;
  isFirstHover: boolean;
  isTourModalOpen: boolean;
  isWalkthroughActive: boolean;
  walkthroughIndex: number;
  toggleExploreMode: () => void;
  setExploreMode: (enabled: boolean) => void;
  markAsSeen: (id: string) => void;
  resetTour: () => void;
  openTourModal: () => void;
  closeTourModal: () => void;
  startWalkthrough: (onTabChange?: (tab: any) => void) => void;
  stopWalkthrough: () => void;
  nextWalkthroughStep: (onTabChange?: (tab: any) => void) => void;
  prevWalkthroughStep: (onTabChange?: (tab: any) => void) => void;
  inspectItem: (id: string, onTabChange?: (tab: any) => void) => void;
  hoverItem: (id: string, element: HTMLElement) => void;
  unhoverItem: (immediate?: boolean, forceClose?: boolean) => void;
  isMouseInsideTooltipRef: React.MutableRefObject<boolean>;
  isUiInteracting: boolean;
  setUiInteracting: (interacting: boolean) => void;
}

const ExploreTourContext = createContext<ExploreTourContextType | null>(null);

export const ExploreTourProvider: React.FC<{
  children: React.ReactNode;
  onTabChange?: (tab: string) => void;
}> = ({ children, onTabChange }) => {
  const [isExploreMode, setIsExploreModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      return stored !== null ? JSON.parse(stored) : false; // Default to false
    } catch {
      return false; // Default to false
    }
  });

  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SEEN);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeItem, setActiveItem] = useState<ExploreTourItem | null>(null);
  const [activeAnchorRect, setActiveAnchorRect] = useState<DOMRect | null>(null);
  const [isFirstHover, setIsFirstHover] = useState<boolean>(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState<boolean>(false);
  const [walkthroughIndex, setWalkthroughIndex] = useState<number>(0);
  const [isUiInteracting, setUiInteracting] = useState<boolean>(false);

  // Global UI Interaction Detection Hook
  useEffect(() => {
    let interactionTimeout: NodeJS.Timeout;

    const startInteraction = (e: Event) => {
      // Don't flag as interacting if they are just moving the mouse over the tour beacon
      if (e.type === 'focusin') {
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'BUTTON' && target.hasAttribute('data-explore-id')) {
          return;
        }
      }
      
      // For mousedown, we only want to suppress hover if they are holding click (e.g. scrubbing sliders)
      // or clicking on an input/dropdown.
      setUiInteracting(true);
      if (interactionTimeout) clearTimeout(interactionTimeout);
    };

    const stopInteraction = () => {
      // Debounce the stop to handle quick transitions between interactable elements
      if (interactionTimeout) clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        // If an input or dropdown is still focused, maintain interaction state
        if (
          document.activeElement &&
          (document.activeElement.tagName === 'SELECT' ||
           document.activeElement.tagName === 'INPUT' ||
           document.activeElement.tagName === 'TEXTAREA')
        ) {
          return;
        }
        setUiInteracting(false);
      }, 150);
    };

    document.addEventListener('focusin', startInteraction);
    document.addEventListener('focusout', stopInteraction);
    document.addEventListener('mousedown', startInteraction);
    document.addEventListener('mouseup', stopInteraction);
    document.addEventListener('touchstart', startInteraction);
    document.addEventListener('touchend', stopInteraction);

    return () => {
      document.removeEventListener('focusin', startInteraction);
      document.removeEventListener('focusout', stopInteraction);
      document.removeEventListener('mousedown', startInteraction);
      document.removeEventListener('mouseup', stopInteraction);
      document.removeEventListener('touchstart', startInteraction);
      document.removeEventListener('touchend', stopInteraction);
      if (interactionTimeout) clearTimeout(interactionTimeout);
    };
  }, []);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unhoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseInsideTooltipRef = useRef<boolean>(false);
  const activeElementRef = useRef<HTMLElement | null>(null);

  const markAsSeen = useCallback((id: string) => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error('Error saving explore tour progress:', err);
      }
      return next;
    });

    try {
      weatherSynth.playRadarScanPing();
    } catch {
      // Audio optional
    }
  }, []);

  const resetTour = useCallback(() => {
    setSeenIds(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY_SEEN);
    } catch {
      // Ignore
    }
    setActiveItem(null);
    setActiveAnchorRect(null);
    setIsWalkthroughActive(false);
  }, []);

  const setExploreMode = useCallback((enabled: boolean) => {
    setIsExploreModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, JSON.stringify(enabled));
    } catch {
      // Ignore
    }
    if (!enabled) {
      setActiveItem(null);
      setActiveAnchorRect(null);
      setIsWalkthroughActive(false);
    }
  }, []);

  const toggleExploreMode = useCallback(() => {
    setExploreMode(!isExploreMode);
  }, [isExploreMode, setExploreMode]);

  const openTourModal = useCallback(() => {
    setIsTourModalOpen(true);
  }, []);

  const closeTourModal = useCallback(() => {
    setIsTourModalOpen(false);
  }, []);

  const hoverItem = useCallback((id: string, element: HTMLElement) => {
    if (!isExploreMode && !isWalkthroughActive) return;
    if (isUiInteracting && !isWalkthroughActive) return;

    if (unhoverTimerRef.current) {
      clearTimeout(unhoverTimerRef.current);
      unhoverTimerRef.current = null;
    }

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      const item = EXPLORE_TOUR_ITEMS.find((t) => t.id === id);
      if (!item) return;

      const isFirst = !seenIds.has(id);
      setIsFirstHover(isFirst);
      activeElementRef.current = element;
      setActiveAnchorRect(element.getBoundingClientRect());
      setActiveItem(item);

      // Play soft discover blip on first hover
      if (isFirst) {
        try {
          weatherSynth.playConfirmationTone();
        } catch {
          // Ignore
        }
      }
    }, 300);
  }, [isExploreMode, isWalkthroughActive, isUiInteracting, seenIds]);

  const unhoverItem = useCallback((immediate = false, forceClose = false) => {
    if (isWalkthroughActive && !forceClose) return; // In walkthrough, don't dismiss on unhover unless forced

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (immediate) {
      if (forceClose || !isMouseInsideTooltipRef.current) {
        setActiveItem(null);
        setActiveAnchorRect(null);
      }
      return;
    }

    if (unhoverTimerRef.current) {
      clearTimeout(unhoverTimerRef.current);
    }

    unhoverTimerRef.current = setTimeout(() => {
      if (forceClose || !isMouseInsideTooltipRef.current) {
        setActiveItem(null);
        setActiveAnchorRect(null);
      }
    }, 240);
  }, [isWalkthroughActive]);

  const inspectItem = useCallback((id: string, tabChangeHandler?: (tab: any) => void) => {
    const item = EXPLORE_TOUR_ITEMS.find((t) => t.id === id);
    if (!item) return;

    // Switch tab if necessary
    const changeTab = tabChangeHandler || onTabChange;
    if (item.tabTarget && changeTab) {
      changeTab(item.tabTarget);
    }

    // Dismiss modal if open
    setIsTourModalOpen(false);

    // Allow DOM to settle, then find and scroll to target
    setTimeout(() => {
      let targetEl = document.querySelector(item.targetSelector) as HTMLElement | null;
      if (!targetEl) {
        targetEl = document.querySelector(`[data-explore-id="${id}"]`) as HTMLElement | null;
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activeElementRef.current = targetEl;
        setActiveAnchorRect(targetEl.getBoundingClientRect());
        setActiveItem(item);
        setIsFirstHover(!seenIds.has(id));
      } else {
        // Even if element is hidden, show tooltip with fixed center placement
        setActiveAnchorRect(null);
        setActiveItem(item);
        setIsFirstHover(!seenIds.has(id));
      }
    }, 280);
  }, [onTabChange, seenIds]);

  const startWalkthrough = useCallback((tabChangeHandler?: (tab: any) => void) => {
    setIsTourModalOpen(false);
    setIsWalkthroughActive(true);
    setWalkthroughIndex(0);
    const firstItem = EXPLORE_TOUR_ITEMS[0];
    if (firstItem) {
      inspectItem(firstItem.id, tabChangeHandler);
    }
  }, [inspectItem]);

  const stopWalkthrough = useCallback(() => {
    setIsWalkthroughActive(false);
    setActiveItem(null);
    setActiveAnchorRect(null);
  }, []);

  const nextWalkthroughStep = useCallback((tabChangeHandler?: (tab: any) => void) => {
    if (!isWalkthroughActive) return;
    const nextIdx = (walkthroughIndex + 1) % EXPLORE_TOUR_ITEMS.length;
    setWalkthroughIndex(nextIdx);
    const nextItem = EXPLORE_TOUR_ITEMS[nextIdx];
    if (nextItem) {
      inspectItem(nextItem.id, tabChangeHandler);
    }
  }, [isWalkthroughActive, walkthroughIndex, inspectItem]);

  const prevWalkthroughStep = useCallback((tabChangeHandler?: (tab: any) => void) => {
    if (!isWalkthroughActive) return;
    const prevIdx = (walkthroughIndex - 1 + EXPLORE_TOUR_ITEMS.length) % EXPLORE_TOUR_ITEMS.length;
    setWalkthroughIndex(prevIdx);
    const prevItem = EXPLORE_TOUR_ITEMS[prevIdx];
    if (prevItem) {
      inspectItem(prevItem.id, tabChangeHandler);
    }
  }, [isWalkthroughActive, walkthroughIndex, inspectItem]);

  // Global event delegation for data-explore-id
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-explore-id]') as HTMLElement | null;
      if (target) {
        const id = target.getAttribute('data-explore-id');
        if (id) {
          hoverItem(id, target);
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-explore-id]') as HTMLElement | null;
      if (target) {
        unhoverItem();
      }
    };

    const handleScrollOrResize = () => {
      if (activeItem && activeElementRef.current) {
        setActiveAnchorRect(activeElementRef.current.getBoundingClientRect());
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (unhoverTimerRef.current) clearTimeout(unhoverTimerRef.current);
    };
  }, [hoverItem, unhoverItem, activeItem]);

  return (
    <ExploreTourContext.Provider
      value={{
        isExploreMode,
        seenIds,
        totalCount: EXPLORE_TOUR_ITEMS.length,
        exploredCount: seenIds.size,
        activeItem,
        activeAnchorRect,
        isFirstHover,
        isTourModalOpen,
        isWalkthroughActive,
        walkthroughIndex,
        toggleExploreMode,
        setExploreMode,
        markAsSeen,
        resetTour,
        openTourModal,
        closeTourModal,
        startWalkthrough,
        stopWalkthrough,
        nextWalkthroughStep,
        prevWalkthroughStep,
        inspectItem,
        hoverItem,
        unhoverItem,
        isMouseInsideTooltipRef,
        isUiInteracting,
        setUiInteracting,
      }}
    >
      {children}
    </ExploreTourContext.Provider>
  );
};

export const useExploreTour = () => {
  const context = useContext(ExploreTourContext);
  if (!context) {
    throw new Error('useExploreTour must be used within an ExploreTourProvider');
  }
  return context;
};
