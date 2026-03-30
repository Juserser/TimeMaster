import React, { useRef, useEffect, useState } from 'react';
import './index.css';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { DataProvider } from './contexts/DataContext';
import Header from './components/Header';
import MasterTasksPanel from './components/MasterTasksPanel';
import TimeboxPanel from './components/TimeboxPanel';
import CalendarView from './components/CalendarView';

const AppContent: React.FC = () => {
  const { 
    fontSize, opacity, theme, leftWidth, setLeftWidth, 
    performanceMode, viewMode, clickThrough 
  } = useSettings();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth > 5 && newWidth < 95) setLeftWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { 
      window.removeEventListener('mousemove', handleMouseMove); 
      window.removeEventListener('mouseup', handleMouseUp); 
    };
  }, [isResizing, setLeftWidth]);

  return (
    <div className={`widget-container ${theme} ${performanceMode ? 'performance-mode' : ''} ${clickThrough ? 'click-through-active' : ''}`} 
      style={{ 
        fontSize: `${fontSize}px`, 
        backgroundColor: `rgba(var(--bg-rgb), ${opacity})`,
        '--app-opacity': opacity 
      } as React.CSSProperties} 
      ref={containerRef}>
      <div className="drag-handle"></div>
      
      <Header />

      <main className="main-content">
        {viewMode === 'calendar' ? (
          <CalendarView />
        ) : (
          <>
            <MasterTasksPanel />
            <div className={`resizer ${isResizing ? 'resizing' : ''}`} onMouseDown={() => setIsResizing(true)}></div>
            <TimeboxPanel contentAreaRef={contentAreaRef} />
          </>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </SettingsProvider>
  );
};

export default App;
