import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { t, COLOR_PALETTE } from '../utils/i18n';
import { LinkItem } from '../types';

interface ContextMenuState {
  taskId: string;
  x: number;
  y: number;
}

const MasterTasksPanel: React.FC = () => {
  const { leftWidth, showNotepad, notepadHeight, setNotepadHeight, language, detailMemoHeight, setDetailMemoHeight } = useSettings();
  const {
    masterTasks, setMasterTasks, notepadContent, setNotepadContent,
    moveTaskToDate, selectedDate, formatLocalDate,
    blocks, setBlocks,
    selectedDetail, setSelectedDetail,
  } = useData();

  const [newTaskInput, setNewTaskInput] = useState('');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // 링크 추가 입력 상태
  const [newLinkTarget, setNewLinkTarget] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkLabel, setEditingLinkLabel] = useState('');

  const electronAPI = (window as any).electronAPI;

  // 현재 선택된 아이템 데이터
  const selectedItem = selectedDetail
    ? selectedDetail.type === 'task'
      ? masterTasks.find(t => t.id === selectedDetail.id) ?? null
      : blocks.find(b => b.id === selectedDetail.id) ?? null
    : null;

  const selectedTitle = selectedItem
    ? selectedDetail?.type === 'task'
      ? (selectedItem as any).text
      : (selectedItem as any).title
    : '';

  const selectedMemo = (selectedItem as any)?.memo ?? '';
  const selectedLinks: LinkItem[] = (selectedItem as any)?.links ?? [];

  const updateMemo = (memo: string) => {
    if (!selectedDetail || !selectedItem) return;
    if (selectedDetail.type === 'task') {
      setMasterTasks(masterTasks.map(t => t.id === selectedDetail.id ? { ...t, memo } : t));
    } else {
      setBlocks(blocks.map(b => b.id === selectedDetail.id ? { ...b, memo } : b));
    }
  };

  const updateLinks = (links: LinkItem[]) => {
    if (!selectedDetail || !selectedItem) return;
    if (selectedDetail.type === 'task') {
      setMasterTasks(masterTasks.map(t => t.id === selectedDetail.id ? { ...t, links } : t));
    } else {
      setBlocks(blocks.map(b => b.id === selectedDetail.id ? { ...b, links } : b));
    }
  };

  const detectLinkType = (target: string): 'url' | 'file' =>
    target.startsWith('http://') || target.startsWith('https://') ? 'url' : 'file';

  const autoLabel = (target: string, type: 'url' | 'file'): string => {
    if (type === 'url') {
      try { return new URL(target).hostname; } catch { return target; }
    }
    return target.split(/[\\/]/).pop() || target;
  };

  const addLink = (target: string, labelOverride?: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;
    const type = detectLinkType(trimmed);
    const label = labelOverride || autoLabel(trimmed, type);
    updateLinks([...selectedLinks, { id: Date.now().toString(), label, target: trimmed, type }]);
  };

  const handleManualAdd = () => {
    addLink(newLinkTarget);
    setNewLinkTarget('');
    setShowLinkInput(false);
  };

  const handleLinkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 파일 드래그 (탐색기, 바로가기 포함)
    if (e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        const filePath = (file as any).path;
        if (filePath) addLink(filePath, file.name);
      });
      return;
    }

    // URL 드래그 (브라우저)
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri) addLink(uri);
  };

  const handleRemoveLink = (linkId: string) => {
    updateLinks(selectedLinks.filter(l => l.id !== linkId));
  };

  const handleRenameLink = (linkId: string, newLabel: string) => {
    updateLinks(selectedLinks.map(l => l.id === linkId ? { ...l, label: newLabel } : l));
    setEditingLinkId(null);
  };

  const handleOpenLink = (link: LinkItem) => {
    if (!electronAPI) return;
    if (link.type === 'url') {
      electronAPI.openExternal(link.target);
    } else {
      electronAPI.openPath(link.target);
    }
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    setMasterTasks([...masterTasks, { id: Date.now().toString(), text: newTaskInput, completed: false }]);
    setNewTaskInput('');
  };

  const handleReorderDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceId = e.dataTransfer.getData('taskReorderId');
    if (!sourceId) return;
    const sourceIndex = masterTasks.findIndex(tk => tk.id === sourceId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) return;
    const updated = [...masterTasks];
    const [removed] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, removed);
    setMasterTasks(updated);
  };

  const handleSetColor = (taskId: string, color: string) => {
    setMasterTasks(masterTasks.map(tk => tk.id === taskId ? { ...tk, color } : tk));
    setContextMenu(null);
  };

  const handleMoveToTomorrow = (taskId: string) => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    moveTaskToDate(taskId, formatLocalDate(tomorrow));
    setContextMenu(null);
  };

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = notepadHeight;
    const notepadEl = e.currentTarget.parentElement;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(80, Math.min(600, startHeight + deltaY));
      if (notepadEl) notepadEl.style.height = `${newHeight}px`;
    };

    const onMouseUp = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setNotepadHeight(Math.max(80, Math.min(600, startHeight + deltaY)));
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseDownMemoResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = detailMemoHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      setDetailMemoHeight(Math.max(40, Math.min(400, startH + delta)));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const showPanel = showNotepad || !!selectedDetail;

  return (
    <section
      className="master-tasks-panel"
      style={{ width: 'var(--left-panel-width)', flex: 'none' }}
      onClick={() => setContextMenu(null)}
    >
      <h2>{t(language, 'masterTasks')}</h2>
      <div className="task-input-container">
        <input
          type="text"
          className="task-input"
          placeholder={t(language, 'addTask')}
          value={newTaskInput}
          onChange={(e) => setNewTaskInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
        />
      </div>
      <ul className="task-list">
        {masterTasks.map((task, index) => (
          <li
            key={task.id}
            className={`task-item ${dragOverIndex === index ? 'drag-over-task' : ''} ${selectedDetail?.type === 'task' && selectedDetail.id === task.id ? 'task-item-selected' : ''}`}
            draggable
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('.task-checkbox') || target.closest('.delete-btn') || target.closest('.task-input')) return;
              setSelectedDetail({ type: 'task', id: task.id });
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('taskReorderId', task.id);
              e.dataTransfer.setData('text/plain', task.text);
              e.dataTransfer.setData('taskId', task.id);
              e.dataTransfer.effectAllowed = 'copyMove';
              e.currentTarget.classList.add('dragging');
            }}
            onDragEnd={(e) => {
              e.currentTarget.classList.remove('dragging');
              setDragOverIndex(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (e.dataTransfer.types.includes('taskreorderid')) setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleReorderDrop(e, index)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ taskId: task.id, x: e.clientX, y: e.clientY });
            }}
          >
            {task.color && <div className="task-color-bar" style={{ backgroundColor: task.color }} />}
            <input
              type="checkbox"
              className="task-checkbox"
              checked={task.completed}
              onChange={() => setMasterTasks(masterTasks.map(tk =>
                tk.id === task.id ? { ...tk, completed: !tk.completed } : tk
              ))}
            />
            {editingTask === task.id ? (
              <input
                autoFocus
                className="task-input edit-mode"
                value={task.text}
                onBlur={() => setEditingTask(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setMasterTasks(masterTasks.map(tk =>
                      tk.id === task.id ? { ...tk, text: (e.target as HTMLInputElement).value } : tk
                    ));
                    setEditingTask(null);
                  }
                }}
                onChange={(e) => setMasterTasks(masterTasks.map(tk =>
                  tk.id === task.id ? { ...tk, text: e.target.value } : tk
                ))}
              />
            ) : (
              <span
                className={`task-text ${task.completed ? 'completed' : ''}`}
                onDoubleClick={() => setEditingTask(task.id)}
                title={task.text}
              >
                {task.text}
              </span>
            )}
            {(task.memo || (task.links && task.links.length > 0)) && (
              <span className="task-detail-indicator" title="메모/링크 있음">◆</span>
            )}
            <button
              className="delete-btn"
              onClick={() => setMasterTasks(masterTasks.filter(tk => tk.id !== task.id))}
            >×</button>
          </li>
        ))}
      </ul>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-title">{t(language, 'setColor')}</div>
          <div className="color-palette">
            {COLOR_PALETTE.map(({ color, labelKey }) => (
              <div
                key={color || 'default'}
                className="color-swatch"
                title={t(language, labelKey)}
                style={{
                  backgroundColor: color || 'transparent',
                  border: color ? `2px solid ${color}` : '2px dashed var(--text-secondary)',
                }}
                onClick={() => handleSetColor(contextMenu.taskId, color)}
              />
            ))}
          </div>
          <div className="context-menu-divider" />
          <button className="context-menu-action" onClick={() => handleMoveToTomorrow(contextMenu.taskId)}>
            {t(language, 'moveToTomorrow')}
          </button>
        </div>
      )}

      {showPanel && (
        <div className={`notepad-container ${isResizing ? 'resizing' : ''}`} style={{ height: `${notepadHeight}px`, flex: 'none' }}>
          <div className="notepad-resizer" onMouseDown={handleMouseDownResizer} />

          {selectedDetail && selectedItem ? (
            <div className="detail-panel">
              {/* 헤더 */}
              <div className="detail-header">
                <span className="detail-title" title={selectedTitle}>{selectedTitle}</span>
                <button className="detail-close" onClick={() => setSelectedDetail(null)}>×</button>
              </div>

              {/* 메모 */}
              <textarea
                className="detail-memo-textarea"
                style={{ height: `${detailMemoHeight}px` }}
                placeholder={language === 'ko' ? '메모...' : 'Memo...'}
                value={selectedMemo}
                onChange={(e) => updateMemo(e.target.value)}
              />
              <div className="detail-memo-resizer" onMouseDown={handleMouseDownMemoResizer} />

              {/* 링크 */}
              <div
                className={`detail-links${isDragOver ? ' drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleLinkDrop}
              >
                <div className="detail-links-header">
                  <span className="detail-links-label">{t(language, 'detailLinks')}</span>
                  {!showLinkInput && (
                    <button className="detail-links-plus" onClick={() => setShowLinkInput(true)}>+</button>
                  )}
                </div>

                {showLinkInput && (
                  <div className="detail-link-manual">
                    <input
                      autoFocus
                      className="detail-link-input"
                      placeholder={language === 'ko' ? 'URL 또는 파일 경로...' : 'URL or file path...'}
                      value={newLinkTarget}
                      onChange={(e) => setNewLinkTarget(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleManualAdd();
                        if (e.key === 'Escape') { setShowLinkInput(false); setNewLinkTarget(''); }
                      }}
                      onBlur={() => { if (!newLinkTarget.trim()) setShowLinkInput(false); }}
                    />
                  </div>
                )}

                <div className="detail-links-list">
                  {selectedLinks.map(link => (
                    <div key={link.id} className="detail-link-item">
                      <span className="detail-link-icon">{link.type === 'url' ? '🔗' : '📁'}</span>
                      {editingLinkId === link.id ? (
                        <input
                          autoFocus
                          className="detail-link-label-input"
                          value={editingLinkLabel}
                          onChange={(e) => setEditingLinkLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameLink(link.id, editingLinkLabel);
                            if (e.key === 'Escape') setEditingLinkId(null);
                          }}
                          onBlur={() => handleRenameLink(link.id, editingLinkLabel)}
                        />
                      ) : (
                        <span
                          className="detail-link-label"
                          title={link.target}
                          onDoubleClick={() => { setEditingLinkId(link.id); setEditingLinkLabel(link.label || link.target); }}
                        >
                          {link.label || link.target}
                        </span>
                      )}
                      <button className="detail-link-open" onClick={() => handleOpenLink(link)}>
                        {t(language, 'openLink')}
                      </button>
                      <button className="detail-link-remove" onClick={() => handleRemoveLink(link.id)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h3>{t(language, 'notepad')}</h3>
              <textarea
                className="notepad-input"
                placeholder={t(language, 'notepadPlaceholder')}
                value={notepadContent}
                onChange={(e) => setNotepadContent(e.target.value)}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default MasterTasksPanel;
