'use client';

import { useEffect } from 'react';

export default function StatsTracker() {
  useEffect(() => {
    const trackStats = async () => {
      try {
        // Check if user has visited before using localStorage
        const hasVisited = localStorage.getItem('stark_visited');
        const isNewVisitor = !hasVisited;
        
        if (isNewVisitor) {
          localStorage.setItem('stark_visited', 'true');
        }

        // Increment PV and UV (if new)
        await fetch('/api/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isNewVisitor }),
        });
      } catch (error) {
        console.error('[StatsTracker] Failed to track stats:', error);
      }
    };

    trackStats();
  }, []);

  return null; // This component doesn't render anything
}
