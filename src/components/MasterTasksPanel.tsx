import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { t, COLOR_PALETTE } from '../utils/i18n';

interface ContextMenuState {
  taskId: string;
  x: number;
  y: number;
}

const MasterTasksPanel: React.FC = () => {
  const { leftWidth, showNotepad, notepadHeight, setNotepadHeight, language } = useSettings();
  const { masterTasks, setMasterTasks, notepadContent, setNotepadContent } = useData();
  const [newTaskInput, setNewTaskInput] = useState('');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isResizing, setIsResizing] = useState(false);

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

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = notepadHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(80, Math.min(600, startHeight + deltaY));
      setNotepadHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <section
      className="master-tasks-panel"
      style={{ width: `${leftWidth}%`, flex: 'none' }}
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
            className={`task-item ${dragOverIndex === index ? 'drag-over-task' : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('taskReorderId', task.id);
              e.dataTransfer.setData('text/plain', task.text);
              e.dataTransfer.effectAllowed = 'copyMove';
              e.currentTarget.classList.add('dragging');
            }}
            onDragEnd={(e) => {
              e.currentTarget.classList.remove('dragging');
              setDragOverIndex(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (e.dataTransfer.types.includes('taskreorderid')) {
                setDragOverIndex(index);
              }
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleReorderDrop(e, index)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ taskId: task.id, x: e.clientX, y: e.clientY });
            }}
          >
            {task.color && (
              <div className="task-color-bar" style={{ backgroundColor: task.color }} />
            )}
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
                  border: color
                    ? `2px solid ${color}`
                    : '2px dashed var(--text-secondary)',
                }}
                onClick={() => handleSetColor(contextMenu.taskId, color)}
              />
            ))}
          </div>
        </div>
      )}

      {showNotepad && (
        <div className={`notepad-container ${isResizing ? 'resizing' : ''}`} style={{ height: `${notepadHeight}px`, flex: 'none' }}>
          <div 
            className="notepad-resizer" 
            onMouseDown={handleMouseDownResizer}
          />
          <h3>{t(language, 'notepad')}</h3>
          <textarea
            className="notepad-input"
            placeholder={t(language, 'notepadPlaceholder')}
            value={notepadContent}
            onChange={(e) => setNotepadContent(e.target.value)}
          />
        </div>
      )}
    </section>
  );
};

export default MasterTasksPanel;
