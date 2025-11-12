const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs').promises
const fsSync = require('fs')

// Directorio de datos de la app
const userDataPath = app.getPath('userData')
const envsDir = path.join(userDataPath, 'envs')
const backupsDir = path.join(userDataPath, 'backups')

// Crear directorios si no existen
async function initDirs() {
  try {
    await fs.mkdir(envsDir, { recursive: true })
    await fs.mkdir(backupsDir, { recursive: true })
  } catch (error) {
    console.error('Error creando directorios:', error)
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')
  mainWindow.webContents.openDevTools()
}

app.whenReady().then(async () => {
  await initDirs()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// === IPC HANDLERS ===

// Listar todos los proyectos
ipcMain.handle('get-projects', async () => {
  try {
    const files = await fs.readdir(envsDir)
    const projects = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(envsDir, file), 'utf-8')
          const data = JSON.parse(content)
          
          // Ensure envs is always an array
          if (!Array.isArray(data.envs)) {
            data.envs = []
          }
          
          projects.push({
            id: file.replace('.json', ''),
            name: data.name || 'Sin nombre',
            description: data.description || '',
            envs: data.envs,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          })
        } catch (parseError) {
          console.error(`Error parseando ${file}:`, parseError)
          // Skip corrupted files
        }
      }
    }
    
    return projects
  } catch (error) {
    console.error('Error obteniendo proyectos:', error)
    return []
  }
})

// Crear o actualizar proyecto
ipcMain.handle('save-project', async (event, project) => {
  try {
    if (!project || !project.id) {
      return { success: false, error: 'Datos de proyecto inválidos' }
    }
    
    const filename = `${project.id}.json`
    const filepath = path.join(envsDir, filename)
    
    // Crear backup antes de guardar
    if (fsSync.existsSync(filepath)) {
      await createBackup(project.id)
    }
    
    // Ensure envs is always an array with valid entries
    const envs = Array.isArray(project.envs) ? project.envs.map(env => ({
      key: env && env.key != null ? String(env.key) : '',
      value: env && env.value != null ? String(env.value) : '',
      enabled: env && env.enabled !== false
    })) : []
    
    const data = {
      name: project.name || 'Sin nombre',
      description: project.description || '',
      envs: envs,
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await fs.writeFile(filepath, JSON.stringify(data, null, 2))
    return { success: true }
  } catch (error) {
    console.error('Error guardando proyecto:', error)
    return { success: false, error: error.message }
  }
})

// Eliminar proyecto
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    if (!projectId) {
      return { success: false, error: 'ID de proyecto inválido' }
    }
    
    await createBackup(projectId) // Backup antes de eliminar
    const filepath = path.join(envsDir, `${projectId}.json`)
    
    if (fsSync.existsSync(filepath)) {
      await fs.unlink(filepath)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error eliminando proyecto:', error)
    return { success: false, error: error.message }
  }
})

// Crear backup
async function createBackup(projectId) {
  try {
    const sourceFile = path.join(envsDir, `${projectId}.json`)
    if (!fsSync.existsSync(sourceFile)) return
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupsDir, `${projectId}_${timestamp}.json`)
    
    await fs.copyFile(sourceFile, backupFile)
    
    // Mantener solo los últimos 10 backups por proyecto
    await cleanOldBackups(projectId)
  } catch (error) {
    console.error('Error creando backup:', error)
  }
}

// Limpiar backups antiguos
async function cleanOldBackups(projectId) {
  try {
    const files = await fs.readdir(backupsDir)
    const projectBackups = files
      .filter(f => f.startsWith(projectId + '_'))
      .sort()
      .reverse()
    
    // Eliminar backups antiguos (mantener solo 10)
    for (let i = 10; i < projectBackups.length; i++) {
      await fs.unlink(path.join(backupsDir, projectBackups[i]))
    }
  } catch (error) {
    console.error('Error limpiando backups:', error)
  }
}

// Listar backups
ipcMain.handle('get-backups', async (event, projectId) => {
  try {
    const files = await fs.readdir(backupsDir)
    const backups = files
      .filter(f => f.startsWith(projectId + '_'))
      .map(f => {
        const match = f.match(/_(.+)\.json$/)
        return {
          filename: f,
          timestamp: match ? match[1] : '',
          date: new Date(match[1].replace(/-/g, ':'))
        }
      })
      .sort((a, b) => b.date - a.date)
    
    return backups
  } catch (error) {
    console.error('Error obteniendo backups:', error)
    return []
  }
})

// Restaurar backup
ipcMain.handle('restore-backup', async (event, projectId, backupFilename) => {
  try {
    const backupFile = path.join(backupsDir, backupFilename)
    const targetFile = path.join(envsDir, `${projectId}.json`)
    
    await fs.copyFile(backupFile, targetFile)
    return { success: true }
  } catch (error) {
    console.error('Error restaurando backup:', error)
    return { success: false, error: error.message }
  }
})

// Importar archivo .env
ipcMain.handle('import-env-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Environment Files', extensions: ['env'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null
    }
    
    const content = await fs.readFile(result.filePaths[0], 'utf-8')
    const envs = parseEnvFile(content)
    
    return {
      filename: path.basename(result.filePaths[0]),
      envs
    }
  } catch (error) {
    console.error('Error importando archivo:', error)
    return null
  }
})

// Exportar como archivo .env
ipcMain.handle('export-env-file', async (event, projectName, envs) => {
  try {
    const safeName = (projectName || 'project').replace(/[^a-z0-9-_]/gi, '-')
    const result = await dialog.showSaveDialog({
      defaultPath: `.env.${safeName}`,
      filters: [
        { name: 'Environment Files', extensions: ['env'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || !result.filePath) {
      return { success: false }
    }
    
    const content = generateEnvFile(envs)
    await fs.writeFile(result.filePath, content)
    
    return { success: true }
  } catch (error) {
    console.error('Error exportando archivo:', error)
    return { success: false, error: error.message }
  }
})

// Parser de archivos .env
function parseEnvFile(content) {
  const envs = []
  
  if (!content || typeof content !== 'string') {
    return envs
  }
  
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      let value = match[2].trim()
      // Remover comillas si existen
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      envs.push({
        key: match[1].trim(),
        value: value,
        enabled: true
      })
    }
  }
  
  return envs
}

// Generar contenido de archivo .env
function generateEnvFile(envs) {
  if (!Array.isArray(envs)) {
    return ''
  }
  
  return envs
    .filter(env => env && env.enabled && env.key)
    .map(env => {
      const key = String(env.key)
      const value = env.value != null ? String(env.value) : ''
      const needsQuotes = value.includes(' ') || value.includes('#') || value.includes('\n')
      const finalValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value
      return `${key}=${finalValue}`
    })
    .join('\n')
}

// Auto-detectar envs en directorio
ipcMain.handle('scan-directory', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null
    }
    
    const dirPath = result.filePaths[0]
    const files = await fs.readdir(dirPath)
    const envFiles = files.filter(f => f.startsWith('.env'))
    
    const detected = []
    for (const file of envFiles) {
      try {
        const content = await fs.readFile(path.join(dirPath, file), 'utf-8')
        const envs = parseEnvFile(content)
        detected.push({
          filename: file,
          envs
        })
      } catch (fileError) {
        console.error(`Error leyendo ${file}:`, fileError)
        // Skip files that can't be read
      }
    }
    
    return {
      directory: dirPath,
      files: detected
    }
  } catch (error) {
    console.error('Error escaneando directorio:', error)
    return null
  }
})