// hooks/useSidebarManager.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface SidebarManagerConfig {
  autoHideEnabled?: boolean;
  autoHideDelay?: number;
  respectUserPreference?: boolean;
  onAutoHide?: (sides: string[]) => void;
}

interface ScreenSizeInfo {
  isMobile: boolean;
  isTablet: boolean;
  isSmallLaptop: boolean;
  isMediumLaptop: boolean;
  isLargeScreen: boolean;
  width: number;
  height: number;
}

export function useSidebarManager(config: SidebarManagerConfig = {}) {
  const {
    autoHideEnabled = true,
    autoHideDelay = 1500,
    respectUserPreference = true,
    onAutoHide
  } = config;

  // Core state
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [screenSize, setScreenSize] = useState<ScreenSizeInfo>({
    isMobile: false,
    isTablet: false,
    isSmallLaptop: false,
    isMediumLaptop: false,
    isLargeScreen: true,
    width: 1920,
    height: 1080
  });

  // User interaction tracking
  const [userManuallyToggled, setUserManuallyToggled] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // ✅ Fix: Initialize with null!
  const userPreferenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Screen size detection with enhanced breakpoints
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const newScreenSize: ScreenSizeInfo = {
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isSmallLaptop: width >= 1024 && width < 1366,
        isMediumLaptop: width >= 1366 && width < 1600,
        isLargeScreen: width >= 1600,
        width,
        height
      };

      setScreenSize(newScreenSize);

      // Apply smart defaults based on screen size (only if user hasn't manually toggled recently)
      if (!userManuallyToggled) {
        if (newScreenSize.isMobile) {
          setLeftSidebarVisible(false);
          setRightSidebarVisible(false);
        } else if (newScreenSize.isTablet) {
          setLeftSidebarVisible(false);
          setRightSidebarVisible(false);
        } else if (newScreenSize.isSmallLaptop) {
          setLeftSidebarVisible(true);
          setRightSidebarVisible(false);
        } else if (newScreenSize.isMediumLaptop) {
          setLeftSidebarVisible(true);
          setRightSidebarVisible(true);
        } else {
          setLeftSidebarVisible(true);
          setRightSidebarVisible(true);
        }
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [userManuallyToggled]);

  // Smart auto-hide logic based on screen size and action
  const autoHideAfterAction = useCallback((actionType: string = 'general') => {
    if (!autoHideEnabled || userManuallyToggled) return;

    setLastAction(actionType);

    // Clear any existing timeout
    if (autoHideTimeout.current) {
      clearTimeout(autoHideTimeout.current);
    }

    autoHideTimeout.current = setTimeout(() => {
      const hiddenSides: string[] = [];

      if (screenSize.isMobile || screenSize.isTablet) {
        // Mobile/tablet: hide both sidebars
        setLeftSidebarVisible(false);
        setRightSidebarVisible(false);
        hiddenSides.push('left', 'right');
      } else if (screenSize.isSmallLaptop) {
        // Small laptop (13-14"): hide left to prioritize center content
        setLeftSidebarVisible(false);
        hiddenSides.push('left');
        // Keep right sidebar if it was visible, but make it narrower
      } else if (screenSize.isMediumLaptop) {
        // Medium laptop (15-16"): hide left sidebar only for complex actions
        if (['analyze', 'generate', 'convert'].includes(actionType)) {
          setLeftSidebarVisible(false);
          hiddenSides.push('left');
        }
      }
      // Large screens: don't auto-hide

      if (hiddenSides.length > 0 && onAutoHide) {
        onAutoHide(hiddenSides);
      }
    }, autoHideDelay);
  }, [autoHideEnabled, userManuallyToggled, screenSize, autoHideDelay, onAutoHide]);

  // Manual toggle handlers with user preference tracking
  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarVisible(prev => !prev);
    setUserManuallyToggled(true);

    if (respectUserPreference) {
      // Clear existing timeout
      if (userPreferenceTimeout.current) {
        clearTimeout(userPreferenceTimeout.current);
      }

      // Reset user manual flag after 10 seconds of inactivity
      userPreferenceTimeout.current = setTimeout(() => {
        setUserManuallyToggled(false);
      }, 10000);
    }
  }, [respectUserPreference]);

  const toggleRightSidebar = useCallback(() => {
    if (screenSize.isMobile) return; // Don't show right sidebar on mobile

    setRightSidebarVisible(prev => !prev);
    setUserManuallyToggled(true);

    if (respectUserPreference) {
      if (userPreferenceTimeout.current) {
        clearTimeout(userPreferenceTimeout.current);
      }

      userPreferenceTimeout.current = setTimeout(() => {
        setUserManuallyToggled(false);
      }, 10000);
    }
  }, [respectUserPreference, screenSize.isMobile]);

  // Show/hide specific sidebar
  const showLeftSidebar = useCallback(() => {
    setLeftSidebarVisible(true);
    setUserManuallyToggled(true);
  }, []);

  const hideLeftSidebar = useCallback(() => {
    setLeftSidebarVisible(false);
    setUserManuallyToggled(true);
  }, []);

  const showRightSidebar = useCallback(() => {
    if (!screenSize.isMobile) {
      setRightSidebarVisible(true);
      setUserManuallyToggled(true);
    }
  }, [screenSize.isMobile]);

  const hideRightSidebar = useCallback(() => {
    setRightSidebarVisible(false);
    setUserManuallyToggled(true);
  }, []);

  // Reset to defaults based on screen size
  const resetToDefaults = useCallback(() => {
    setUserManuallyToggled(false);

    if (screenSize.isMobile || screenSize.isTablet) {
      setLeftSidebarVisible(false);
      setRightSidebarVisible(false);
    } else if (screenSize.isSmallLaptop) {
      setLeftSidebarVisible(true);
      setRightSidebarVisible(false);
    } else {
      setLeftSidebarVisible(true);
      setRightSidebarVisible(true);
    }
  }, [screenSize]);

  // Get optimal layout classes based on current state
  const getLayoutClasses = useCallback(() => {
    const showLeft = leftSidebarVisible;
    const showRight = rightSidebarVisible && !screenSize.isMobile;

    if (showLeft && showRight) {
      if (screenSize.isSmallLaptop) return "grid-cols-[280px_1fr_260px]";
      if (screenSize.isMediumLaptop) return "grid-cols-[300px_1fr_280px]";
      return "grid-cols-[320px_1fr_300px]";
    }
    if (showLeft && !showRight) {
      if (screenSize.isSmallLaptop) return "grid-cols-[280px_1fr]";
      return "grid-cols-[320px_1fr]";
    }
    if (!showLeft && showRight) {
      if (screenSize.isSmallLaptop) return "grid-cols-[1fr_260px]";
      return "grid-cols-[1fr_300px]";
    }
    return "grid-cols-[1fr]";
  }, [leftSidebarVisible, rightSidebarVisible, screenSize]);

  // Get screen size label for UI
  const getScreenLabel = useCallback(() => {
    if (screenSize.isMobile) return "📱 Mobile";
    if (screenSize.isTablet) return "📱 Tablet";
    if (screenSize.isSmallLaptop) return "💻 13-14\"";
    if (screenSize.isMediumLaptop) return "💻 15-16\"";
    return "🖥️ Large";
  }, [screenSize]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (userPreferenceTimeout.current) {
        clearTimeout(userPreferenceTimeout.current);
      }
      if (autoHideTimeout.current) {
        clearTimeout(autoHideTimeout.current);
      }
    };
  }, []);

  return {
    // State
    leftSidebarVisible,
    rightSidebarVisible,
    screenSize,
    userManuallyToggled,
    lastAction,

    // Actions
    autoHideAfterAction,
    toggleLeftSidebar,
    toggleRightSidebar,
    showLeftSidebar,
    hideLeftSidebar,
    showRightSidebar,
    hideRightSidebar,
    resetToDefaults,

    // Utilities
    getLayoutClasses,
    getScreenLabel,

    // Computed properties
    shouldShowRightSidebar: rightSidebarVisible && !screenSize.isMobile,
    canShowRightSidebar: !screenSize.isMobile,
    isCompactMode: screenSize.isMobile || screenSize.isTablet,
    needsNarrowSidebars: screenSize.isSmallLaptop,
  };
}
