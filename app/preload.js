/**
 * Escola Sabatina Timer — Preload Bridge
 * @author Alisson Andrade
 * @license MIT
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Get available monitors
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Open display on a specific monitor
  openDisplay: (displayId) => ipcRenderer.invoke('open-display', displayId),

  // Close the display window
  closeDisplay: () => ipcRenderer.invoke('close-display'),

  // Send timer commands to the display window
  sendTimerCommand: (command) => ipcRenderer.send('timer-command', command),

  // Receive timer commands (for display window)
  onTimerCommand: (callback) => {
    ipcRenderer.on('timer-command', (event, command) => callback(command));
  },

  // Get current timer state (for display to sync on open)
  getTimerState: () => ipcRenderer.invoke('get-timer-state'),

  // Receive notification that display was closed (for control window)
  onDisplayClosed: (callback) => {
    ipcRenderer.on('display-closed', () => callback());
  }
});
