const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// --- 중복 실행 방지 (Single Instance Lock) ---
const instanceLock = app.requestSingleInstanceLock();

if (!instanceLock) {
  app.quit();
}

// 두 번째 인스턴스가 실행되려고 할 때 실행되는 이벤트
app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

// --- 데이터 저장소 (File Store) 로직 ---
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'timemaster-data.json');
const backupDirPath = path.join(userDataPath, 'backups');

function readStore() {
  if (!fs.existsSync(dataFilePath)) return {};
  try {
    const content = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to read store:', e);
    return {};
  }
}

function writeStore(key, value) {
  try {
    const data = readStore();
    data[key] = value;
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write store:', e);
  }
}

function saveAutoBackup() {
  try {
    if (!fs.existsSync(backupDirPath)) {
      fs.mkdirSync(backupDirPath, { recursive: true });
    }
    const data = readStore();
    const dateStr = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDirPath, `timemaster-backup-${dateStr}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    // 최근 7개만 유지
    const files = fs.readdirSync(backupDirPath)
      .filter(f => f.startsWith('timemaster-backup-'))
      .sort()
      .reverse();
    files.slice(7).forEach(f => {
      try { fs.unlinkSync(path.join(backupDirPath, f)); } catch (e) {}
    });
    console.log(`Auto backup saved: ${backupFile}`);
    return backupFile;
  } catch (e) {
    console.error('Auto backup failed:', e);
    return null;
  }
}

function deleteStore(key) {
  try {
    const data = readStore();
    delete data[key];
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to delete store:', e);
  }
}

let win;
let tray;
app.isQuitting = false;

// 16x16 시계 모양의 Base64 PNG 아이콘
const trayIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAWklEQVQ4y2P8//8/AyUYGhoayjAwyDNIInMZGBgYGRgYGBmYGJgYmBlYmBkZGBiYGJhRJRkZGBmYGRkZ4CphZGAA6YSpY8T/IDUwcY0Y/Y/hH0gNSC0DAy00AADqWwwP8oYjCwAAAABJRU5ErkJggg==';

// 투명 창 최적화 스위치
app.commandLine.appendSwitch('enable-transparent-visuals');

function createWindow() {
  const data = readStore();
  const { width = 650, height = 600, x, y } = data['window-bounds'] || {};

  win = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: data['always-on-top'] || false,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const saveBounds = () => {
    writeStore('window-bounds', win.getBounds());
  };

  win.on('resize', saveBounds);
  win.on('move', saveBounds);

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
    // 초기 클릭 무시 상태 적용
    if (data['click-through']) {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    } else {
      saveBounds(); // 종료 시 최종 위치 저장
    }
    return false;
  });
}

// --- IPC 핸들러 등록 ---
ipcMain.on('minimize-window', () => win?.minimize());
ipcMain.on('close-window', () => win?.hide());

ipcMain.handle('read-store', (event, key) => {
  const data = readStore();
  return key ? data[key] : data;
});

ipcMain.on('write-store', (event, key, value) => {
  writeStore(key, value);
});

ipcMain.on('delete-store', (event, key) => {
  deleteStore(key);
});

ipcMain.on('clear-store', () => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify({}, null, 2));
    console.log('All data cleared from file store.');
  } catch (e) {
    console.error('Failed to clear store:', e);
  }
});

ipcMain.handle('get-auto-launch', () => {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (e) {
    console.error('Failed to get auto-launch settings:', e);
    return false;
  }
});

ipcMain.on('set-auto-launch', (event, enabled) => {
  if (enabled && isDev) {
    console.log('Auto-launch enablement ignored in development mode.');
    return;
  }
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
    });
  } catch (e) {
    console.error('Failed to set auto-launch:', e);
  }
});

ipcMain.handle('save-backup', () => {
  return saveAutoBackup();
});

ipcMain.on('set-always-on-top', (event, enabled) => {
  if (win) {
    writeStore('always-on-top', enabled);
    win.setAlwaysOnTop(enabled, 'floating');
    updateTrayMenu({ isAOT: enabled });
  }
});

ipcMain.on('set-ignore-mouse-events', (event, enabled) => {
  if (win) {
    writeStore('click-through', enabled);
    win.setIgnoreMouseEvents(enabled, { forward: true });
    updateTrayMenu({ isClickThrough: enabled });
  }
});

ipcMain.on('set-widget-mode', (event, enabled) => {
  if (win) {
    win.setSkipTaskbar(enabled);
  }
});

function updateTrayMenu(overrides = {}) {
  const data = readStore();
  const isAOT = overrides.isAOT !== undefined ? overrides.isAOT : (data['always-on-top'] || false);
  const isClickThrough = overrides.isClickThrough !== undefined ? overrides.isClickThrough : (data['click-through'] || false);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'TimeMaster 열기', click: () => { win.show(); win.focus(); } },
    { label: 'TimeMaster 숨기기', click: () => win.hide() },
    { type: 'separator' },
    { 
      label: '최상단 고정', 
      type: 'checkbox', 
      checked: isAOT, 
      click: (menuItem) => {
        writeStore('always-on-top', menuItem.checked);
        if (win) win.setAlwaysOnTop(menuItem.checked, 'floating');
        win.webContents.send('settings-updated', { 'always-on-top': menuItem.checked });
      }
    },
    { 
      label: '클릭 무시', 
      type: 'checkbox', 
      checked: isClickThrough, 
      click: (menuItem) => {
        writeStore('click-through', menuItem.checked);
        if (win) win.setIgnoreMouseEvents(menuItem.checked, { forward: true });
        win.webContents.send('settings-updated', { 'click-through': menuItem.checked });
      }
    },
    { type: 'separator' },
    { label: '종료', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  if (tray) tray.setContextMenu(contextMenu);
}

function createTray() {
  const icon = nativeImage.createFromDataURL(trayIconBase64);
  tray = new Tray(icon);
  updateTrayMenu();
  tray.setToolTip('TimeMaster');
  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  saveAutoBackup();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
