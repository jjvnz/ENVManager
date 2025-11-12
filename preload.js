const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Proyectos
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  
  // Backups
  getBackups: (projectId) => ipcRenderer.invoke('get-backups', projectId),
  restoreBackup: (projectId, filename) => ipcRenderer.invoke('restore-backup', projectId, filename),
  
  // Importar/Exportar
  importEnvFile: () => ipcRenderer.invoke('import-env-file'),
  exportEnvFile: (projectName, envs) => ipcRenderer.invoke('export-env-file', projectName, envs),
  
  // Escanear directorio
  scanDirectory: () => ipcRenderer.invoke('scan-directory')
})