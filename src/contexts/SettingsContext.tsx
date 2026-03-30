import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../utils/i18n';

export type ViewMode = 'timebox' | 'calendar';

interface SettingsContextType {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  interval: number;
  setIntervalVal: (v: number) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  appTitle: string;
  setAppTitle: (v: string) => void;
  leftWidth: number;
  setLeftWidth: (v: number) => void;
  opacity: number;
  setOpacity: (v: number) => void;
  showTimeIndicator: boolean;
  setShowTimeIndicator: (v: boolean) => void;
  showTimeBadge: boolean;
  setShowTimeBadge: (v: boolean) => void;
  showNotepad: boolean;
  setShowNotepad: (v: boolean) => void;
  notepadHeight: number;
  setNotepadHeight: (v: number) => void;
  showNotifications: boolean;
  setShowNotifications: (v: boolean) => void;
  autoLaunch: boolean;
  setAutoLaunch: (v: boolean) => void;
  widgetMode: boolean;
  setWidgetMode: (v: boolean) => void;
  theme: string;
  setTheme: (v: string) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  performanceMode: boolean;
  setPerformanceMode: (v: boolean) => void;
  alwaysOnTop: boolean;
  setAlwaysOnTop: (v: boolean) => void;
  clickThrough: boolean;
  setClickThrough: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timebox');
  const [interval, setIntervalVal] = useState<number>(15);
  const [fontSize, setFontSize] = useState<number>(14);
  const [appTitle, setAppTitle] = useState<string>('TimeMaster');
  const [leftWidth, setLeftWidth] = useState<number>(45);
  const [opacity, setOpacity] = useState<number>(0.92);
  const [showTimeIndicator, setShowTimeIndicator] = useState<boolean>(true);
  const [showTimeBadge, setShowTimeBadge] = useState<boolean>(true);
  const [showNotepad, setShowNotepad] = useState<boolean>(true);
  const [notepadHeight, setNotepadHeight] = useState<number>(150);
  const [showNotifications, setShowNotifications] = useState<boolean>(true);
  const [autoLaunch, setAutoLaunchState] = useState<boolean>(false);
  const [widgetMode, setWidgetModeState] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>('theme-blue');
  const [language, setLanguageState] = useState<Language>('ko');
  const [performanceMode, setPerformanceModeState] = useState<boolean>(false);
  const [alwaysOnTop, setAlwaysOnTopState] = useState<boolean>(false);
  const [clickThrough, setClickThroughState] = useState<boolean>(false);

  const electronAPI = (window as any).electronAPI;

  useEffect(() => {
    const loadSettings = async () => {
      if (!electronAPI) {
        setIsLoaded(true);
        return;
      }

      const savedInterval = await electronAPI.readStore('grid-interval');
      const savedFontSize = await electronAPI.readStore('font-size');
      const savedAppTitle = await electronAPI.readStore('app-title');
      const savedLeftWidth = await electronAPI.readStore('left-width');
      const savedOpacity = await electronAPI.readStore('app-opacity');
      const savedShowTimeIndicator = await electronAPI.readStore('show-time-indicator');
      const savedShowTimeBadge = await electronAPI.readStore('show-time-badge');
      const savedShowNotepad = await electronAPI.readStore('show-notepad');
      const savedNotepadHeight = await electronAPI.readStore('notepad-height');
      const savedShowNotifications = await electronAPI.readStore('show-notifications');
      const savedTheme = await electronAPI.readStore('app-theme');
      const savedWidgetMode = await electronAPI.readStore('widget-mode');
      const savedLanguage = await electronAPI.readStore('app-language');
      const savedPerformanceMode = await electronAPI.readStore('performance-mode');
      const savedAlwaysOnTop = await electronAPI.readStore('always-on-top');
      const savedClickThrough = await electronAPI.readStore('click-through');
      const autoLaunchStatus = await electronAPI.getAutoLaunch();

      if (savedInterval !== undefined) setIntervalVal(savedInterval);
      if (savedFontSize !== undefined) setFontSize(savedFontSize);
      if (savedAppTitle !== undefined) setAppTitle(savedAppTitle);
      if (savedLeftWidth !== undefined) setLeftWidth(savedLeftWidth);
      if (savedOpacity !== undefined) setOpacity(savedOpacity);
      if (savedShowTimeIndicator !== undefined) setShowTimeIndicator(savedShowTimeIndicator);
      if (savedShowTimeBadge !== undefined) setShowTimeBadge(savedShowTimeBadge);
      if (savedShowNotepad !== undefined) setShowNotepad(savedShowNotepad);
      if (savedNotepadHeight !== undefined) setNotepadHeight(savedNotepadHeight);
      if (savedShowNotifications !== undefined) setShowNotifications(savedShowNotifications);
      if (savedTheme !== undefined) setTheme(savedTheme);
      if (savedLanguage !== undefined) setLanguageState(savedLanguage);
      if (savedPerformanceMode !== undefined) setPerformanceModeState(savedPerformanceMode);
      if (savedAlwaysOnTop !== undefined) setAlwaysOnTopState(savedAlwaysOnTop);
      if (savedClickThrough !== undefined) setClickThroughState(savedClickThrough);

      if (savedWidgetMode !== undefined) {
        setWidgetModeState(savedWidgetMode);
        electronAPI.setWidgetMode(savedWidgetMode);
      }
      setAutoLaunchState(!!autoLaunchStatus);

      setIsLoaded(true);
    };
    loadSettings();
  }, [electronAPI]);

  // 트레이 메뉴나 단축키로 외부에서 변경된 설정 반영
  useEffect(() => {
    if (!electronAPI?.onSettingsUpdated) return;
    const unsubscribe = electronAPI.onSettingsUpdated((data: any) => {
      if (data['always-on-top'] !== undefined) setAlwaysOnTopState(data['always-on-top']);
      if (data['click-through'] !== undefined) setClickThroughState(data['click-through']);
    });
    return () => unsubscribe();
  }, [electronAPI]);

  const setAutoLaunch = (enabled: boolean) => {
    setAutoLaunchState(enabled);
    electronAPI?.setAutoLaunch(enabled);
  };

  const setWidgetMode = (enabled: boolean) => {
    setWidgetModeState(enabled);
    electronAPI?.setWidgetMode(enabled);
  };

  const setAlwaysOnTop = (enabled: boolean) => {
    setAlwaysOnTopState(enabled);
    electronAPI?.setAlwaysOnTop(enabled);
  };

  const setClickThrough = (enabled: boolean) => {
    setClickThroughState(enabled);
    electronAPI?.setIgnoreMouseEvents(enabled);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setPerformanceMode = (enabled: boolean) => {
    setPerformanceModeState(enabled);
  };

  useEffect(() => {
    if (!isLoaded || !electronAPI) return;
    electronAPI.writeStore('grid-interval', interval);
    electronAPI.writeStore('font-size', fontSize);
    electronAPI.writeStore('app-title', appTitle);
    electronAPI.writeStore('left-width', leftWidth);
    electronAPI.writeStore('app-opacity', opacity);
    electronAPI.writeStore('show-time-indicator', showTimeIndicator);
    electronAPI.writeStore('show-time-badge', showTimeBadge);
    electronAPI.writeStore('show-notepad', showNotepad);
    electronAPI.writeStore('notepad-height', notepadHeight);
    electronAPI.writeStore('show-notifications', showNotifications);
    electronAPI.writeStore('app-theme', theme);
    electronAPI.writeStore('widget-mode', widgetMode);
    electronAPI.writeStore('app-language', language);
    electronAPI.writeStore('performance-mode', performanceMode);
  }, [isLoaded, interval, fontSize, appTitle, leftWidth, opacity, showTimeIndicator, showTimeBadge, showNotepad, notepadHeight, showNotifications, theme, widgetMode, language, performanceMode, electronAPI]);

  if (!isLoaded) return null;

  return (
    <SettingsContext.Provider value={{
      viewMode, setViewMode,
      interval, setIntervalVal, fontSize, setFontSize, appTitle, setAppTitle,
      leftWidth, setLeftWidth, opacity, setOpacity,
      showTimeIndicator, setShowTimeIndicator, showTimeBadge, setShowTimeBadge,
      showNotepad, setShowNotepad, 
      notepadHeight, setNotepadHeight,
      showNotifications, setShowNotifications,
      autoLaunch, setAutoLaunch,
      widgetMode, setWidgetMode, theme, setTheme,
      language, setLanguage,
      performanceMode, setPerformanceMode,
      alwaysOnTop, setAlwaysOnTop,
      clickThrough, setClickThrough,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
