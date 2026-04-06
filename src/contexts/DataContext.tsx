import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TimeBlock, MasterTask } from '../types';

export type DetailItem = { type: 'task' | 'block'; id: string } | null;

interface DataContextType {
  selectedDate: Date;
  setSelectedDate: (v: Date) => void;
  dateKey: string;
  blocks: TimeBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<TimeBlock[]>>;
  masterTasks: MasterTask[];
  setMasterTasks: React.Dispatch<React.SetStateAction<MasterTask[]>>;
  notepadContent: string;
  setNotepadContent: (v: string) => void;
  formatLocalDate: (date: Date) => string;
  datesWithData: Set<string>;
  moveTaskToDate: (taskId: string, targetDateKey: string) => Promise<void>;
  moveIncompleteToTomorrow: () => Promise<void>;
  selectedDetail: DetailItem;
  setSelectedDetail: (v: DetailItem) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const formatLocalDate = useCallback((date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateKey = formatLocalDate(selectedDate);

  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [masterTasks, setMasterTasks] = useState<MasterTask[]>([]);
  const [notepadContent, setNotepadContent] = useState('');
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<DetailItem>(null);

  const electronAPI = (window as any).electronAPI;

  // 데이터가 있는 날짜 목록 갱신 (달력 마커용)
  const refreshDatesWithData = useCallback(async () => {
    if (!electronAPI) return;
    const allData = await electronAPI.readStore();
    if (!allData) return;
    
    const dates = new Set<string>();
    Object.keys(allData).forEach(key => {
      if (key.startsWith('blocks-') || key.startsWith('tasks-')) {
        const data = allData[key];
        if (Array.isArray(data) && data.length > 0) {
          const datePart = key.split('-').slice(1).join('-');
          dates.add(datePart);
        }
      }
    });
    setDatesWithData(dates);
  }, [electronAPI]);

  // 자정 자동 날짜 갱신 로직
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const todayKey = formatLocalDate(now);
      const lastCheckKey = localStorage.getItem('last-date-check');
      
      if (lastCheckKey && lastCheckKey !== todayKey) {
        // 날짜가 변경됨. 현재 보고 있는 날짜가 '어제'였다면 '오늘'로 자동 이동
        if (dateKey === lastCheckKey) {
          setSelectedDate(now);
        }
      }
      localStorage.setItem('last-date-check', todayKey);
    };

    const interval = setInterval(checkMidnight, 60000); // 1분마다 체크
    return () => clearInterval(interval);
  }, [dateKey, formatLocalDate]);

  // 데이터 로드 및 마이그레이션 로직
  useEffect(() => {
    const loadData = async () => {
      if (!electronAPI) {
        setIsLoaded(true);
        setLoadedDateKey(dateKey);
        return;
      }

      // 1. 마이그레이션 확인
      const isMigrated = await electronAPI.readStore('is-migrated-to-file');
      if (!isMigrated) {
        console.log('Migrating localStorage to file store...');
        const allKeys = Object.keys(localStorage);
        for (const key of allKeys) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              electronAPI.writeStore(key, parsed);
            } catch (e) {
              electronAPI.writeStore(key, val);
            }
          }
        }
        electronAPI.writeStore('is-migrated-to-file', true);
      }

      // 2. 현재 날짜 데이터 로드
      const savedBlocks = await electronAPI.readStore(`blocks-${dateKey}`);
      const savedTasks = await electronAPI.readStore(`tasks-${dateKey}`);
      const savedNotepad = await electronAPI.readStore(`notepad-${dateKey}`);

      setBlocks(savedBlocks || []);
      setMasterTasks(savedTasks || []);
      setNotepadContent(savedNotepad || '');

      await refreshDatesWithData();
      setLoadedDateKey(dateKey);
      setIsLoaded(true);
    };

    setIsLoaded(false);
    setSelectedDetail(null);
    loadData();
  }, [dateKey, electronAPI, refreshDatesWithData]);

  // 데이터 저장 (현재 로드된 날짜와 저장하려는 날짜가 일치할 때만 수행)
  useEffect(() => { 
    if (!isLoaded || !electronAPI || loadedDateKey !== dateKey) return;
    electronAPI.writeStore(`blocks-${dateKey}`, blocks); 
    refreshDatesWithData();
  }, [blocks, dateKey, isLoaded, electronAPI, loadedDateKey, refreshDatesWithData]);

  useEffect(() => { 
    if (!isLoaded || !electronAPI || loadedDateKey !== dateKey) return;
    electronAPI.writeStore(`tasks-${dateKey}`, masterTasks); 
    refreshDatesWithData();
  }, [masterTasks, dateKey, isLoaded, electronAPI, loadedDateKey, refreshDatesWithData]);

  useEffect(() => { 
    if (!isLoaded || !electronAPI || loadedDateKey !== dateKey) return;
    electronAPI.writeStore(`notepad-${dateKey}`, notepadContent); 
  }, [notepadContent, dateKey, isLoaded, electronAPI, loadedDateKey]);

  const moveTaskToDate = async (taskId: string, targetDateKey: string) => {
    const task = masterTasks.find(t => t.id === taskId);
    if (!task || !electronAPI) return;
    const targetTasks = (await electronAPI.readStore(`tasks-${targetDateKey}`)) || [];
    const movedTask = { ...task, id: `moved-${Date.now()}`, completed: false };
    await electronAPI.writeStore(`tasks-${targetDateKey}`, [...targetTasks, movedTask]);
    setMasterTasks(masterTasks.filter(t => t.id !== taskId));
    await refreshDatesWithData();
  };

  const moveIncompleteToTomorrow = async () => {
    if (!electronAPI) return;
    const incomplete = masterTasks.filter(t => !t.completed);
    if (incomplete.length === 0) return;
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatLocalDate(tomorrow);
    const targetTasks = (await electronAPI.readStore(`tasks-${tomorrowKey}`)) || [];
    const moved = incomplete.map(t => ({ ...t, id: `moved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, completed: false }));
    await electronAPI.writeStore(`tasks-${tomorrowKey}`, [...targetTasks, ...moved]);
    setMasterTasks(masterTasks.filter(t => t.completed));
    await refreshDatesWithData();
  };

  if (!isLoaded) return null;

  return (
    <DataContext.Provider value={{
      selectedDate, setSelectedDate, dateKey,
      blocks, setBlocks, masterTasks, setMasterTasks,
      notepadContent, setNotepadContent, formatLocalDate,
      datesWithData,
      moveTaskToDate, moveIncompleteToTomorrow,
      selectedDetail, setSelectedDetail,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
