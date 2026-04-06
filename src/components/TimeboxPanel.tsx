import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { ModalData, TimeBlock } from '../types';
import { t, COLOR_PALETTE } from '../utils/i18n';
import BlockModal from './BlockModal';

interface TimeboxPanelProps {
  contentAreaRef: React.RefObject<HTMLDivElement>;
}

interface BlockContextMenu {
  blockId: string;
  x: number;
  y: number;
}

const THEME_BG_RGB: Record<string, string> = {
  'theme-blue':    '15, 20, 30',
  'theme-white':   '235, 238, 242',
  'theme-rose':    '25, 15, 20',
  'theme-emerald': '10, 25, 20',
  'theme-amber':   '20, 18, 10',
  'theme-purple':  '20, 10, 30',
};

const TimeboxPanel: React.FC<TimeboxPanelProps> = ({ contentAreaRef }) => {
  const {
    interval, fontSize, showTimeIndicator, showTimeBadge, showNotifications, language, showGrid, theme
  } = useSettings();
  const {
    blocks, setBlocks, dateKey, formatLocalDate, setSelectedDetail, masterTasks
  } = useData();

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<ModalData>({ title: '', duration: 30, startTime: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizingEdge, setResizingEdge] = useState<'top' | 'bottom' | null>(null);
  const [hoveringHandle, setHoveringHandle] = useState(false);
  const timeBlocksLayerRef = useRef<HTMLDivElement>(null);
  const [notifiedBlockIds, setNotifiedBlockIds] = useState<Set<string>>(new Set());
  const [blockContextMenu, setBlockContextMenu] = useState<BlockContextMenu | null>(null);
  const dragScrollState = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const isDragScrolled = useRef(false);
  const draggingBlockIdRef = useRef<string | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [dragOverMins, setDragOverMins] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const min5MinHeight = fontSize * 1.8;
  const pixelsPerMinute = min5MinHeight / 5;
  const rowHeight = pixelsPerMinute * interval;

  const calculateMinsFromEvent = (e: React.DragEvent | MouseEvent) => {
    if (!gridContainerRef.current) return null;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const mins = Math.max(0, Math.min(24 * 60 - 5, Math.floor(relativeY / pixelsPerMinute)));
    return Math.floor(mins / interval) * interval;
  };

  // ── 드래그 스크롤 (빈 공간 클릭+드래그로 상하 이동) ──
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragScrollState.current || !contentAreaRef.current) return;
      const delta = e.clientY - dragScrollState.current.startY;
      if (Math.abs(delta) > 4) {
        isDragScrolled.current = true;
        contentAreaRef.current.classList.add('drag-scrolling');
        contentAreaRef.current.scrollTop = dragScrollState.current.startScrollTop - delta;
      }
    };
    const handleMouseUp = () => {
      if (dragScrollState.current) {
        contentAreaRef.current?.classList.remove('drag-scrolling');
        dragScrollState.current = null;
        setTimeout(() => { isDragScrolled.current = false; }, 0);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [contentAreaRef]);

  // 알림 로직
  useEffect(() => {
    if (!showNotifications) return;
    const isToday = dateKey === formatLocalDate(new Date());
    if (!isToday) return;
    const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    blocks.forEach(block => {
      if (block.startTime === currentTotalMinutes && !notifiedBlockIds.has(block.id)) {
        new Notification('일정 시작', {
          body: `지금 바로 시작하세요: ${block.title}`,
          icon: './favicon.ico'
        });
        setNotifiedBlockIds(prev => new Set(prev).add(block.id));
      }
    });
  }, [currentTime, blocks, showNotifications, dateKey, formatLocalDate, notifiedBlockIds]);

  const isTodayDate = dateKey === formatLocalDate(new Date());
  const currentLineTop = (currentTime.getHours() * 60 + currentTime.getMinutes()) * pixelsPerMinute;

  // ── 스마트 포커스 v2: 날짜가 오늘로 바뀔 때 스크롤 위치 계산 ──
  useEffect(() => {
    if (!isTodayDate || !contentAreaRef.current) return;
    const panelHeight = contentAreaRef.current.clientHeight;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    // 현재 진행 중인 블록이 있으면 그 블록 상단 기준으로 스크롤
    const activeBlock = blocks.find(
      b => b.startTime <= currentMinutes && b.startTime + b.duration > currentMinutes
    );

    let scrollTarget: number;
    if (activeBlock) {
      // 블록 상단이 패널 위쪽 15% 위치에 오도록
      scrollTarget = activeBlock.startTime * pixelsPerMinute - panelHeight * 0.15;
    } else {
      // 현재 시간선이 패널 위쪽 1/3 위치에 오도록
      scrollTarget = currentLineTop - panelHeight / 3;
    }

    setTimeout(() => {
      contentAreaRef.current?.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
    }, 150);
  // dateKey가 바뀔 때만 실행 (매 분마다 스크롤하지 않음)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, isTodayDate]);

  // 리사이징 로직 (상단/하단 모두 지원)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingBlockId || !resizingEdge || !contentAreaRef.current) return;
      const rect = contentAreaRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top + contentAreaRef.current.scrollTop;
      const targetBlock = blocks.find(b => b.id === resizingBlockId);
      if (!targetBlock) return;

      if (resizingEdge === 'bottom') {
        // 하단 리사이즈: duration 변경 (startTime 고정)
        // 현재 블록의 시작 지점 이후에 시작하는 가장 가까운 블록을 찾음
        const nextBlock = blocks
          .filter(b => b.id !== resizingBlockId && b.startTime >= targetBlock.startTime + 5)
          .sort((a, b) => a.startTime - b.startTime)[0];
        
        let maxTime = 24 * 60;
        if (nextBlock) maxTime = nextBlock.startTime;
        
        const requestedEnd = Math.round(relativeY / pixelsPerMinute);
        const finalEnd = Math.min(requestedEnd, maxTime);
        const finalDuration = Math.max(5, finalEnd - targetBlock.startTime);
        
        setBlocks(blocks.map(b => b.id === resizingBlockId ? { ...b, duration: finalDuration } : b));

      } else if (resizingEdge === 'top') {
        // 상단 리사이즈: startTime 변경 (endTime 고정)
        // 현재 블록의 종료 지점 이전에 끝나는 가장 가까운 블록을 찾음
        const blockEnd = targetBlock.startTime + targetBlock.duration;
        const prevBlock = blocks
          .filter(b => b.id !== resizingBlockId && b.startTime + b.duration <= blockEnd - 5)
          .sort((a, b) => (b.startTime + b.duration) - (a.startTime + a.duration))[0];
        
        let minTime = 0;
        if (prevBlock) minTime = prevBlock.startTime + prevBlock.duration;
        
        const requestedStart = Math.round(relativeY / pixelsPerMinute);
        const finalStart = Math.max(minTime, Math.min(requestedStart, blockEnd - 5));
        
        setBlocks(blocks.map(b =>
          b.id === resizingBlockId
            ? { ...b, startTime: finalStart, duration: blockEnd - finalStart }
            : b
        ));
      }
    };

    const handleMouseUp = () => {
      setResizingBlockId(null);
      setResizingEdge(null);
    };

    if (resizingBlockId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingBlockId, resizingEdge, blocks, pixelsPerMinute, setBlocks, contentAreaRef]);

  const handleSaveBlock = () => {
    if (!modalData.title.trim()) {
      if (modalData.id) setBlocks(blocks.filter(b => b.id !== modalData.id));
      setShowModal(false);
      return;
    }
    if (modalData.id) {
      setBlocks(blocks.map(b => b.id === modalData.id
        ? { ...b, title: modalData.title, duration: modalData.duration }
        : b
      ));
    } else {
      setBlocks([...blocks, {
        id: Date.now().toString(),
        startTime: modalData.startTime,
        duration: modalData.duration,
        title: modalData.title,
      }]);
    }
    setShowModal(false);
  };

  const handleDeleteBlock = (id: string) => {
    if (confirm(t(language, 'deleteBlockConfirm'))) {
      setBlocks(blocks.filter(b => b.id !== id));
      setShowModal(false);
    }
  };

  const handleSetBlockColor = (blockId: string, color: string) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, color } : b));
    setBlockContextMenu(null);
  };

  const gridRows = Array.from({ length: (24 * 60) / interval }, (_, i) => {
    const mins = i * interval;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const isHour = m === 0;
    const isQuarter = m % 15 === 0 && !isHour;
    return {
      label: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      isHour, isQuarter, mins
    };
  });

  return (
    <>
      <section
        className="timebox-panel"
        onClick={() => setBlockContextMenu(null)}
      >
        <div 
          className="content-area" 
          ref={contentAreaRef}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).closest('.time-block')) return;
            dragScrollState.current = {
              startY: e.clientY,
              startScrollTop: contentAreaRef.current?.scrollTop ?? 0,
            };
            isDragScrolled.current = false;
          }}
        >
          <div
            className={`grid-container${showGrid ? '' : ' hide-grid'}`}
            ref={gridContainerRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const mins = calculateMinsFromEvent(e);
              setDragOverMins(mins);
            }}
            onDragLeave={() => setDragOverMins(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverMins(null);
              document.body.classList.remove('dragging-active');
              
              const mins = calculateMinsFromEvent(e);
              if (mins === null) return;

              const blockIdFromData = e.dataTransfer.getData('blockId');
              const actualBlockId = blockIdFromData || draggingBlockIdRef.current;
              const taskText = e.dataTransfer.getData('text/plain');
              const taskId = e.dataTransfer.getData('taskId');
              
              const targetId = actualBlockId;

              if (targetId) {
                setBlocks((prevBlocks: TimeBlock[]) => {
                  const targetBlock = prevBlocks.find((b: TimeBlock) => b.id === targetId);
                  if (!targetBlock) return prevBlocks;

                  const isOverlap = prevBlocks.some((b: TimeBlock) =>
                    b.id !== targetId &&
                    mins < b.startTime + b.duration &&
                    mins + targetBlock.duration > b.startTime
                  );

                  if (isOverlap) return prevBlocks;
                  return prevBlocks.map((b: TimeBlock) => b.id === targetId ? { ...b, startTime: mins } : b);
                });
              } else if (taskText) {
                const sourceTask = taskId ? masterTasks.find(t => t.id === taskId) : null;
                setBlocks((prevBlocks: TimeBlock[]) => [...prevBlocks, {
                  id: Date.now().toString(),
                  startTime: mins,
                  duration: interval,
                  title: taskText,
                  ...(sourceTask?.memo ? { memo: sourceTask.memo } : {}),
                  ...(sourceTask?.links?.length ? { links: sourceTask.links } : {}),
                }]);
              }
              
              setTimeout(() => { draggingBlockIdRef.current = null; }, 100);
            }}
          >
            {gridRows.map((row) => (
              <div
                key={row.mins}
                className={`grid-row ${row.isHour ? 'hour-mark' : ''} ${row.isQuarter ? 'quarter-mark' : ''} ${dragOverMins === row.mins ? 'drag-over' : ''}`}
                data-time={row.isHour || row.isQuarter ? row.label : ''}
                onClick={() => {
                  if (isDragScrolled.current) return;
                  setModalData({ title: '', duration: interval, startTime: row.mins });
                  setShowModal(true);
                }}
                style={{ height: `${rowHeight}px` }}
              ></div>
            ))}
            <div className="time-blocks-layer" ref={timeBlocksLayerRef}>
              {blocks.map((block) => {
                const blockHeight = block.duration * pixelsPerMinute;
                const blockStyle: React.CSSProperties = {
                  top: `${block.startTime * pixelsPerMinute}px`,
                  height: `${blockHeight - 1}px`,
                  fontSize: `${fontSize - 1}px`,
                };
                if (block.color) {
                  const bgRgb = THEME_BG_RGB[theme] || '15, 20, 30';
                  blockStyle.background = showGrid
                    ? `${block.color}33`
                    : `linear-gradient(${block.color}33, ${block.color}33), rgb(${bgRgb})`;
                  blockStyle.borderLeftColor = block.color;
                }
                return (
                  <div
                    key={block.id}
                    className="time-block"
                    draggable={!resizingBlockId && !resizingEdge && !hoveringHandle}
                    onDragStart={(e) => {
                      if ((e.target as HTMLElement).classList.contains('block-resize-handle')) {
                        e.preventDefault();
                        return;
                      }
                      draggingBlockIdRef.current = block.id;
                      e.dataTransfer.setData('blockId', block.id);
                      e.dataTransfer.effectAllowed = 'move';
                      document.body.classList.add('dragging-active');
                    }}
                    onDragEnd={() => {
                      document.body.classList.remove('dragging-active');
                      setTimeout(() => {
                        draggingBlockIdRef.current = null;
                      }, 100);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBlockContextMenu({ blockId: block.id, x: e.clientX, y: e.clientY });
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.classList.contains('block-resize-handle')) return;
                      if (draggingBlockIdRef.current) return;
                      setSelectedDetail({ type: 'block', id: block.id });
                    }}
                    title={`${block.title} (${block.duration}${t(language, 'min')})`}
                    style={blockStyle}
                  >
                    <span
                      className="block-text"
                      style={{ lineHeight: `${blockHeight - 1}px` }}
                    >{block.title}</span>
                    <div
                      className="block-resize-handle top"
                      onMouseEnter={() => setHoveringHandle(true)}
                      onMouseLeave={() => setHoveringHandle(false)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingBlockId(block.id);
                        setResizingEdge('top');
                      }}
                    />
                    <div
                      className="block-resize-handle bottom"
                      onMouseEnter={() => setHoveringHandle(true)}
                      onMouseLeave={() => setHoveringHandle(false)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingBlockId(block.id);
                        setResizingEdge('bottom');
                      }}
                    />
                  </div>
                );
              })}
              {isTodayDate && showTimeIndicator && (
                <div className="current-time-line" style={{ top: `${currentLineTop}px` }}></div>
              )}
              {isTodayDate && showTimeBadge && (
                <div className="current-time-badge" style={{ top: `${currentLineTop}px` }}>
                  {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {blockContextMenu && (
        <div
          className="context-menu"
          style={{ position: 'fixed', top: blockContextMenu.y, left: blockContextMenu.x, zIndex: 3000 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-action" onClick={() => {
            const b = blocks.find(b => b.id === blockContextMenu.blockId);
            if (b) { setModalData({ id: b.id, title: b.title, duration: b.duration, startTime: b.startTime }); setShowModal(true); }
            setBlockContextMenu(null);
          }}>{t(language, 'editBlock')}</button>
          <button className="context-menu-action" style={{ color: '#ff4d4d' }} onClick={() => {
            handleDeleteBlock(blockContextMenu.blockId);
            setBlockContextMenu(null);
          }}>{language === 'ko' ? '삭제' : 'Delete'}</button>
          <div className="context-menu-divider" />
          <div className="context-menu-title">{t(language, 'setColor')}</div>
          <div className="color-palette">
            {COLOR_PALETTE.map(({ color, labelKey }) => (
              <div
                key={color || 'default'}
                className="color-swatch"
                title={t(language, labelKey)}
                style={{
                  backgroundColor: color || 'transparent',
                  border: color
                    ? `2px solid ${color}`
                    : '2px dashed var(--text-secondary)',
                }}
                onClick={() => handleSetBlockColor(blockContextMenu.blockId, color)}
              />
            ))}
          </div>
        </div>
      )}

      <BlockModal
        showModal={showModal} setShowModal={setShowModal}
        modalData={modalData} setModalData={setModalData}
        handleSaveBlock={handleSaveBlock}
        handleDeleteBlock={handleDeleteBlock}
        language={language}
      />
    </>
  );
};

export default TimeboxPanel;
