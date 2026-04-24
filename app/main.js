/**
 * Escola Sabatina Timer — Main Process
 * @author Alisson Andrade
 * @license MIT
 */
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let controlWindow = null;
let displayWindow = null;

// Current timer state (kept in main process so display can sync on open)
let currentTimerState = null;

// === Get available displays ===
function getDisplays() {
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    index: i,
    label: d.label || `Monitor ${i + 1}`,
    bounds: d.bounds,
    size: d.size,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
    resolution: `${d.size.width}x${d.size.height}`
  }));
}

// === Create control window ===
function createControlWindow() {
  const primary = screen.getPrimaryDisplay();

  controlWindow = new BrowserWindow({
    width: 600,
    height: 950,
    x: primary.bounds.x + 50,
    y: primary.bounds.y + 10,
    resizable: true,
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    title: 'Escola Sabatina — Controle',
    backgroundColor: '#111827',
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  controlWindow.loadFile('control.html');
  controlWindow.on('closed', () => {
    controlWindow = null;
    if (displayWindow) {
      displayWindow.close();
      displayWindow = null;
    }
  });
}

// === Create or reposition display window ===
function createDisplayWindow(displayId) {
  const displays = screen.getAllDisplays();
  const targetDisplay = displays.find(d => d.id === displayId) || screen.getPrimaryDisplay();
  const { x, y, width, height } = targetDisplay.bounds;

  // Close existing display window if any
  if (displayWindow) {
    displayWindow.close();
    displayWindow = null;
  }

  displayWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  displayWindow.loadFile('display.html');

  // Show and enter fullscreen after loading
  displayWindow.once('ready-to-show', () => {
    displayWindow.show();
    displayWindow.setFullScreen(true);
    displayWindow.focus();

    // Sync current timer state to the newly opened display
    if (currentTimerState) {
      setTimeout(() => {
        if (displayWindow && currentTimerState) {
          displayWindow.webContents.send('timer-command', currentTimerState);
        }
      }, 300);
    }

    // Bring control window back to front
    if (controlWindow) {
      setTimeout(() => controlWindow.focus(), 500);
    }
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
    // Notify control window that display was closed
    if (controlWindow) {
      controlWindow.webContents.send('display-closed');
    }
  });
}

// === IPC Handlers ===

// Send list of displays to control window
ipcMain.handle('get-displays', () => {
  return getDisplays();
});

// Open display on selected monitor
ipcMain.handle('open-display', (event, displayId) => {
  createDisplayWindow(displayId);
  return true;
});

// Close display window
ipcMain.handle('close-display', () => {
  if (displayWindow) {
    displayWindow.close();
    displayWindow = null;
  }
  return true;
});

// Forward timer commands from control to display
ipcMain.on('timer-command', (event, command) => {
  // Keep track of current state for syncing when display opens later
  if (command.type === 'start') {
    currentTimerState = command;
  } else if (command.type === 'adjustEnd') {
    if (currentTimerState) {
      currentTimerState = { ...currentTimerState, type: 'start', startTimestamp: currentTimerState.startTimestamp, endTimestamp: command.newEndTimestamp };
    }
  } else if (command.type === 'updatePhases') {
    if (currentTimerState) {
      currentTimerState = { ...currentTimerState, phases: command.phases };
    }
  } else if (command.type === 'pause') {
    if (currentTimerState) {
      currentTimerState = { ...currentTimerState, isPaused: true, pausedAt: command.pausedAt };
    }
  } else if (command.type === 'resume') {
    if (currentTimerState) {
      const pauseDuration = Date.now() - (currentTimerState.pausedAt || Date.now());
      currentTimerState = {
        ...currentTimerState,
        type: 'start',
        startTimestamp: currentTimerState.startTimestamp + pauseDuration,
        endTimestamp: currentTimerState.endTimestamp,
        isPaused: false,
        pausedAt: null
      };
    }
  } else if (command.type === 'reset') {
    currentTimerState = null;
  }

  // Forward to display window
  if (displayWindow) {
    if (command.type === 'resume' && currentTimerState) {
      displayWindow.webContents.send('timer-command', currentTimerState);
    } else {
      displayWindow.webContents.send('timer-command', command);
    }
  }
});

// Get current timer state (for display to request on open)
ipcMain.handle('get-timer-state', () => {
  return currentTimerState;
});

// === App lifecycle ===
app.whenReady().then(() => {
  createControlWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
