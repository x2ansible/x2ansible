// src/components/ThemeToggle.tsx
"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Debug: Check what's in localStorage
    const savedTheme = localStorage.getItem('theme');
    console.log('🔍 Saved theme from localStorage:', savedTheme);
    
    // Debug: Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('🔍 System prefers dark:', prefersDark);
    
    // Debug: Check current document class
    const hasClassDark = document.documentElement.classList.contains('dark');
    console.log('🔍 Document has dark class:', hasClassDark);
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    console.log('🔍 Should be dark:', shouldBeDark);
    
    setIsDark(shouldBeDark);
    
    // Apply theme
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      console.log('✅ Added dark class');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('✅ Removed dark class');
    }
  }, []);

  const toggleTheme = () => {
    console.log('🔄 Toggle clicked! Current state:', isDark);
    
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('🌙 Switched to dark mode');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('☀️ Switched to light mode');
    }
    
    // Debug: Verify the change
    setTimeout(() => {
      const hasClass = document.documentElement.classList.contains('dark');
      const savedTheme = localStorage.getItem('theme');
      console.log('🔍 After toggle - Has dark class:', hasClass, 'Saved theme:', savedTheme);
    }, 100);
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md">
        <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        <span className="w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-300 dark:border-gray-600"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <svg 
            className="h-4 w-4" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
          Light 
        </>
      ) : (
        <>
          <svg 
            className="h-4 w-4" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          Dark 
        </>
      )}
    </button>
  );
}