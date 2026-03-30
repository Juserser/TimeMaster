import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { MasterTask } from '../types';
import { t } from '../utils/i18n';

const MAX_VISIBLE = 3;

const CalendarView: React.FC = () => {
  const { language } = useSettings();
  const { selectedDate, setSelectedDate, formatLocalDate } = useData();

  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [allTasksData, setAllTasksData] = useState<Record<string, MasterTask[]>>({});
  const [tooltip, setTooltip] = useState<{ dateKey: string; x: number; y: number } | null>(null);

  const loadAllData = useCallback(async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    const allData = await electronAPI.readStore();
    if (!allData) return;
    const tasksData: Record<string, MasterTask[]> = {};
    Object.keys(allData).forEach(key => {
      if (key.startsWith('tasks-')) {
        const dk = key.slice(6);
        const tasks = allData[key];
        if (Array.isArray(tasks) && tasks.length > 0) {
          tasksData[dk] = tasks;
        }
      }
    });
    setAllTasksData(tasksData);
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // Keep calendar month in sync when header date navigation changes month
  useEffect(() => {
    setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const changeMonth = (offset: number) => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const todayKey = formatLocalDate(new Date());
  const selectedKey = formatLocalDate(selectedDate);
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = language === 'ko'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} className="cal-view-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dKey = formatLocalDate(dateObj);
    const isSelected = dKey === selectedKey;
    const isToday = dKey === todayKey;
    const tasks = allTasksData[dKey] || [];
    const visibleTasks = tasks.slice(0, MAX_VISIBLE);
    const hiddenCount = tasks.length - MAX_VISIBLE;

    cells.push(
      <div
        key={d}
        className={`cal-view-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
        onClick={() => setSelectedDate(dateObj)}
        onMouseMove={(e) => {
          if (tasks.length > 0) setTooltip({ dateKey: dKey, x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="cal-day-number">{d}</div>
        <div className="cal-day-tasks">
          {visibleTasks.map(task => (
            <div
              key={task.id}
              className={`cal-task-chip${task.completed ? ' completed' : ''}`}
              style={task.color ? { borderLeftColor: task.color } : {}}
            >
              {task.text}
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="cal-task-overflow">+{hiddenCount}개 더...</div>
          )}
        </div>
      </div>
    );
  }

  const tooltipTasks = tooltip ? allTasksData[tooltip.dateKey] : null;

  return (
    <div className="calendar-view" onClick={() => setTooltip(null)}>
      <div className="cal-view-nav">
        <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>◀</button>
        <span className="cal-view-month-label">{year}년 {month + 1}월</span>
        <button className="cal-nav-btn" onClick={() => changeMonth(1)}>▶</button>
        <button className="cal-nav-today" onClick={() => setSelectedDate(new Date())}>
          {t(language, 'goToToday')}
        </button>
      </div>

      <div className="cal-view-weekdays">
        {weekdays.map(d => <div key={d} className="cal-view-weekday">{d}</div>)}
      </div>

      <div className="cal-view-grid">
        {cells}
      </div>

      {tooltip && tooltipTasks && tooltipTasks.length > 0 && (
        <div
          className="cal-hover-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          {tooltipTasks.map(task => (
            <div
              key={task.id}
              className={`cal-tooltip-task${task.completed ? ' completed' : ''}`}
              style={task.color ? { borderLeftColor: task.color } : {}}
            >
              {task.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
