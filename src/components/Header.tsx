import React, { useRef, useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { exportData, importData } from '../utils/backup';
import { t, Language } from '../utils/i18n';

const Header: React.FC = () => {
  const {
    appTitle, setAppTitle, interval, setIntervalVal, fontSize, setFontSize,
    opacity, setOpacity, theme, setTheme, showTimeIndicator, setShowTimeIndicator,
    showTimeBadge, setShowTimeBadge, showNotepad, setShowNotepad,
    showNotifications, setShowNotifications,
    autoLaunch, setAutoLaunch, widgetMode, setWidgetMode,
    language, setLanguage, performanceMode, setPerformanceMode,
    viewMode, setViewMode, alwaysOnTop, setAlwaysOnTop, clickThrough, setClickThrough,
    showGrid, setShowGrid,
  } = useSettings();

  const {
    selectedDate, setSelectedDate, dateKey, formatLocalDate, datesWithData,
    moveIncompleteToTomorrow,
  } = useData();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showIntervalList, setShowIntervalList] = useState(false);
  const [showFontSizeList, setShowFontSizeList] = useState(false);
  const [showOpacityList, setShowOpacityList] = useState(false);
  const [showThemeList, setShowThemeList] = useState(false);
  const [showLanguageList, setShowLanguageList] = useState(false);
  const [showAdvancedList, setShowAdvancedList] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const menuRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) setShowCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeAllSubmenus = () => {
    setShowIntervalList(false);
    setShowFontSizeList(false);
    setShowOpacityList(false);
    setShowThemeList(false);
    setShowLanguageList(false);
    setShowAdvancedList(false);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const changeCalendarMonth = (offset: number) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(calendarMonth.getMonth() + offset);
    setCalendarMonth(newMonth);
  };

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="cal-day empty" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dKey = formatLocalDate(dateObj);
      const isSelected = dKey === dateKey;
      const isToday = dKey === formatLocalDate(new Date());
      const hasData = datesWithData.has(dKey);
      days.push(
        <div key={d} className={`cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => { setSelectedDate(dateObj); setShowCalendar(false); }}>
          {d}
          {hasData && <div className="plan-dot" />}
        </div>
      );
    }
    return days;
  };

  return (
    <header className="widget-header">
      <div className="header-left">
        {isEditingTitle ? (
          <input autoFocus className="title-input" style={{ fontSize: `${fontSize + 4}px` }}
            value={appTitle} onChange={(e) => setAppTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
        ) : (
          <h1 style={{ fontSize: `${fontSize + 4}px`, cursor: 'pointer' }}
            onClick={() => setIsEditingTitle(true)}>{appTitle}</h1>
        )}

        <div className="date-navigator">
          <button className="date-btn" onClick={() => changeDate(-1)}>◀</button>
          <span className="date-display"
            onClick={() => { setShowCalendar(!showCalendar); setCalendarMonth(new Date(selectedDate)); }}
            title="달력 보기">
            {selectedDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
          </span>
          <button className="date-btn" onClick={() => changeDate(1)}>▶</button>

          {showCalendar && (
            <div className="calendar-popup" ref={calendarRef}>
              <div className="cal-header">
                <button onClick={() => changeCalendarMonth(-1)}>◀</button>
                <span>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</span>
                <button onClick={() => changeCalendarMonth(1)}>▶</button>
              </div>
              <div className="cal-grid-header">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="cal-grid">{renderCalendar()}</div>
              <button className="cal-today-btn"
                onClick={() => { setSelectedDate(new Date()); setShowCalendar(false); }}>
                {t(language, 'goToToday')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="header-actions">
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn${viewMode === 'timebox' ? ' active' : ''}`}
            onClick={() => setViewMode('timebox')}
          >
            {t(language, 'timeboxMode')}
          </button>
          <button
            className={`view-mode-btn${viewMode === 'calendar' ? ' active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            {t(language, 'calendarMode')}
          </button>
        </div>
        <div className="menu-container" ref={menuRef}>
          <button className="menu-trigger" onClick={() => setShowMenu(!showMenu)}>⋮</button>
          {showMenu && (
            <div className="dropdown-menu">
              {/* Grid Interval */}
              <button className={`menu-item ${showIntervalList ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); closeAllSubmenus(); setShowIntervalList(!showIntervalList); }}>
                {t(language, 'gridInterval')} {showIntervalList ? '▲' : '▼'}
              </button>
              {showIntervalList && (
                <div className="submenu-list">
                  {[5, 15, 30].map(val => (
                    <button key={val} className={`menu-item submenu-item ${interval === val ? 'active' : ''}`}
                      onClick={() => { setIntervalVal(val); setShowMenu(false); closeAllSubmenus(); }}>
                      {val} {t(language, 'min')}
                    </button>
                  ))}
                </div>
              )}

              <div className="menu-divider"></div>

              {/* Font Size */}
              <button className={`menu-item ${showFontSizeList ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); closeAllSubmenus(); setShowFontSizeList(!showFontSizeList); }}>
                {t(language, 'fontSize')} {showFontSizeList ? '▲' : '▼'}
              </button>
              {showFontSizeList && (
                <div className="submenu-list">
                  {[12, 14, 16, 18].map(size => (
                    <button key={size} className={`menu-item submenu-item ${fontSize === size ? 'active' : ''}`}
                      onClick={() => { setFontSize(size); setShowMenu(false); closeAllSubmenus(); }}>
                      {size}px
                    </button>
                  ))}
                </div>
              )}

              <div className="menu-divider"></div>

              {/* Opacity */}
              <button className={`menu-item ${showOpacityList ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); closeAllSubmenus(); setShowOpacityList(!showOpacityList); }}>
                {t(language, 'opacity')} {showOpacityList ? '▲' : '▼'}
              </button>
              {showOpacityList && (
                <div className="submenu-list slider-container">
                  <input type="range" min="0.1" max="1.0" step="0.01" value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()} className="opacity-slider" />
                  <div className="slider-label">{Math.round(opacity * 100)}%</div>
                </div>
              )}

              <div className="menu-divider"></div>

              {/* Theme */}
              <button className={`menu-item ${showThemeList ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); closeAllSubmenus(); setShowThemeList(!showThemeList); }}>
                {t(language, 'theme')} {showThemeList ? '▲' : '▼'}
              </button>
              {showThemeList && (
                <div className="submenu-list">
                  {[
                    { id: 'theme-blue', name: 'Deep Space (Dark)' },
                    { id: 'theme-white', name: 'White Pearl (Light)' },
                    { id: 'theme-rose', name: 'Rose Quartz' },
                    { id: 'theme-emerald', name: 'Emerald Forest' },
                    { id: 'theme-amber', name: 'Amber Sunset' },
                    { id: 'theme-purple', name: 'Royal Purple' },
                  ].map(th => (
                    <button key={th.id} className={`menu-item submenu-item ${theme === th.id ? 'active' : ''}`}
                      onClick={() => { setTheme(th.id); setShowMenu(false); closeAllSubmenus(); }}>
                      {th.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="menu-divider"></div>

              {/* Language */}
              <button className={`menu-item ${showLanguageList ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); closeAllSubmenus(); setShowLanguageList(!showLanguageList); }}>
                {t(language, 'language')} {showLanguageList ? '▲' : '▼'}
              </button>
              {showLanguageList && (
                <div className="submenu-list">
                  {([['ko', '한국어'], ['en', 'English']] as [Language, string][]).map(([lang, name]) => (
                    <button key={lang} className={`menu-item submenu-item ${language === lang ? 'active' : ''}`}
                      onClick={() => { setLanguage(lang); setShowMenu(false); closeAllSubmenus(); }}>
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="menu-divider"></div>

              {/* Move incomplete to tomorrow */}
              <button className="menu-item" onClick={() => { moveIncompleteToTomorrow(); setShowMenu(false); }}>
                {t(language, 'moveIncompleteToTomorrow')}
              </button>

              <div className="menu-divider"></div>

              {/* Toggles */}
              <button className={`menu-item ${showGrid ? 'active' : ''}`}
                onClick={() => { setShowGrid(!showGrid); setShowMenu(false); }}>
                {showGrid ? '✓ ' : ''}{t(language, 'showGrid')}
              </button>
              <button className={`menu-item ${showNotepad ? 'active' : ''}`}
                onClick={() => { setShowNotepad(!showNotepad); setShowMenu(false); }}>
                {showNotepad ? '✓ ' : ''}{t(language, 'showNotepad')}
              </button>
              <button className={`menu-item ${showNotifications ? 'active' : ''}`}
                onClick={() => { setShowNotifications(!showNotifications); setShowMenu(false); }}>
                {showNotifications ? '✓ ' : ''}{t(language, 'showNotifications')}
              </button>
              <button className={`menu-item ${alwaysOnTop ? 'active' : ''}`}
                onClick={() => { setAlwaysOnTop(!alwaysOnTop); setShowMenu(false); }}>
                {alwaysOnTop ? '✓ ' : ''}{t(language, 'alwaysOnTop')}
              </button>
              <button className={`menu-item ${clickThrough ? 'active' : ''}`}
                onClick={() => { 
                  if (!clickThrough) {
                    if (confirm(t(language, 'clickThroughUnlock'))) {
                      setClickThrough(true);
                      setShowMenu(false);
                    }
                  } else {
                    setClickThrough(false);
                    setShowMenu(false);
                  }
                }}>
                {clickThrough ? '✓ ' : ''}{t(language, 'clickThrough')}
              </button>

              {/* Advanced Settings */}
              <button className={`menu-item ${showAdvancedList ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); closeAllSubmenus(); setShowAdvancedList(!showAdvancedList); }}>
                {t(language, 'advancedSettings')} {showAdvancedList ? '▲' : '▼'}
              </button>
              {showAdvancedList && (
                <div className="submenu-list">
                  <button className="menu-item submenu-item"
                    onClick={(e) => { e.stopPropagation(); setShowTimeIndicator(!showTimeIndicator); }}>
                    {showTimeIndicator ? '✓ ' : ''}{t(language, 'showTimeLine')}
                  </button>
                  <button className="menu-item submenu-item"
                    onClick={(e) => { e.stopPropagation(); setShowTimeBadge(!showTimeBadge); }}>
                    {showTimeBadge ? '✓ ' : ''}{t(language, 'showTimeBadge')}
                  </button>
                  <button className="menu-item submenu-item"
                    onClick={(e) => { e.stopPropagation(); setPerformanceMode(!performanceMode); }}>
                    {performanceMode ? '✓ ' : ''}{t(language, 'performanceMode')}
                  </button>
                  <div className="menu-divider" style={{ opacity: 0.3 }}></div>
                  <button className="menu-item submenu-item"
                    onClick={(e) => { e.stopPropagation(); setAutoLaunch(!autoLaunch); }}>
                    {autoLaunch ? '✓ ' : ''}{t(language, 'autoLaunch')}
                  </button>
                  <button className="menu-item submenu-item"
                    onClick={(e) => { e.stopPropagation(); setWidgetMode(!widgetMode); }}>
                    {widgetMode ? '✓ ' : ''}{t(language, 'widgetMode')}
                  </button>
                  <div className="menu-divider" style={{ opacity: 0.3 }}></div>
                  <button className="menu-item submenu-item"
                    onClick={() => { exportData(); setShowMenu(false); }}>
                    {t(language, 'exportBackup')}
                  </button>
                  <button className="menu-item submenu-item" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) importData(file);
                    };
                    input.click();
                    setShowMenu(false);
                  }}>
                    {t(language, 'importBackup')}
                  </button>
                  <div className="menu-divider" style={{ opacity: 0.3 }}></div>
                  <button className="menu-item submenu-item" style={{ color: '#ff4d4d' }} onClick={() => {
                    if (confirm(t(language, 'resetConfirm'))) {
                      (window as any).electronAPI?.clearStore();
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}>
                    {t(language, 'resetData')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="window-controls">
          <button className="control-btn" onClick={() => (window as any).electronAPI?.minimize()}>−</button>
          <button className="control-btn close" onClick={() => (window as any).electronAPI?.close()}>✕</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
