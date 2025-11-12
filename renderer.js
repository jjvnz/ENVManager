const app = {
  projects: [],
  currentProject: null,
  searchTerm: '',

  // Helper method to escape HTML and prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  },

  async init() {
    console.log('🚀 Inicializando aplicación...')
    await this.loadProjects()
    this.setupEventListeners()
  },

  async loadProjects() {
    try {
      console.log('📦 Cargando proyectos...')
      this.projects = await window.electronAPI.getProjects()
      console.log(`✅ ${this.projects.length} proyectos cargados`)
      this.renderProjectsList()
    } catch (error) {
      console.error('❌ Error cargando proyectos:', error)
    }
  },

  renderProjectsList() {
    const list = document.getElementById('projectsList')
    if (!list) return
    
    if (!Array.isArray(this.projects) || this.projects.length === 0) {
      list.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-muted);">
          <p>No hay proyectos</p>
        </div>
      `
      return
    }

    list.innerHTML = this.projects.map(project => {
      if (!project) return ''
      
      const isActive = this.currentProject?.id === project.id ? 'active' : ''
      const projectId = project.id || ''
      const projectName = project.name || 'Sin nombre'
      const envsCount = Array.isArray(project.envs) ? project.envs.length : 0
      const updatedDate = project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'
      
      return `
        <div class="project-item ${isActive}" data-project-id="${this.escapeHtml(projectId)}">
          <div class="project-name">${this.escapeHtml(projectName)}</div>
          <div class="project-meta">
            ${envsCount} variables · ${updatedDate}
          </div>
        </div>
      `
    }).filter(Boolean).join('')
  },

  selectProject(projectId) {
    this.currentProject = this.projects.find(p => p.id === projectId)
    if (this.currentProject) {
      this.renderEditor()
      this.renderProjectsList()
    }
  },

  renderEditor() {
    if (!this.currentProject) return

    const container = document.getElementById('editorContainer')
    const title = document.getElementById('projectTitle')
    const actions = document.getElementById('headerActions')

    title.textContent = this.currentProject.name
    actions.style.display = 'flex'

    // Ensure envs is always an array
    if (!Array.isArray(this.currentProject.envs)) {
      this.currentProject.envs = []
    }

    // Safe filtering with null checks
    const searchTermLower = (this.searchTerm || '').toLowerCase()
    const filteredEnvs = this.currentProject.envs.filter(env => {
      if (!env) return false
      if (!searchTermLower) return true
      
      const key = (env.key || '').toLowerCase()
      const value = (env.value || '').toLowerCase()
      return key.includes(searchTermLower) || value.includes(searchTermLower)
    })

    const enabledCount = this.currentProject.envs.filter(e => e && e.enabled).length
    const totalCount = this.currentProject.envs.length

    container.innerHTML = `
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${totalCount}</div>
          <div class="stat-label">Total Variables</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${enabledCount}</div>
          <div class="stat-label">Activas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalCount - enabledCount}</div>
          <div class="stat-label">Desactivadas</div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea class="form-textarea" id="projectDescription">${this.currentProject.description || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Variables de Entorno</label>
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="🔍 Buscar variables...">
        </div>
        <button class="btn btn-primary btn-sm" id="addEnvBtn">➕ Agregar Variable</button>
      </div>

      <div class="env-list" id="envList">
        ${this.renderEnvList(filteredEnvs)}
      </div>
    `

    // Configurar event listeners para el editor
    this.setupEditorListeners()
  },

  renderEnvList(envs) {
    if (!Array.isArray(envs) || envs.length === 0) {
      return '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No hay variables</div>'
    }

    return envs.map((env, index) => {
      // Safe defaults for null/undefined values
      const enabled = env && env.enabled ? 'checked' : ''
      const key = env && env.key != null ? String(env.key) : ''
      const value = env && env.value != null ? String(env.value) : ''
      
      return `
        <div class="env-item" data-env-index="${index}">
          <input type="checkbox" ${enabled} class="env-toggle">
          <input type="text" placeholder="KEY" value="${this.escapeHtml(key)}" class="env-key">
          <input type="text" placeholder="value" value="${this.escapeHtml(value)}" class="env-value">
          <div class="env-actions">
            <button class="icon-btn env-duplicate" title="Duplicar">📋</button>
            <button class="icon-btn env-remove" title="Eliminar">🗑️</button>
          </div>
        </div>
      `
    }).join('')
  },

  setupEventListeners() {
    console.log('🔧 Configurando event listeners...')
    
    // Sidebar buttons
    document.getElementById('newProjectBtn')?.addEventListener('click', () => this.newProject())
    document.getElementById('scanDirectoryBtn')?.addEventListener('click', () => this.scanDirectory())
    
    // Header buttons - delegación de eventos
    document.getElementById('headerActions')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-backups')) this.showBackups()
      else if (e.target.classList.contains('btn-import')) this.importEnv()
      else if (e.target.classList.contains('btn-export')) this.exportEnv()
      else if (e.target.classList.contains('btn-save')) this.saveProject()
      else if (e.target.classList.contains('btn-delete')) this.deleteProject()
    })
    
    // Project list - delegación de eventos
    document.getElementById('projectsList')?.addEventListener('click', (e) => {
      const projectItem = e.target.closest('.project-item')
      if (projectItem) {
        const projectId = projectItem.getAttribute('data-project-id')
        this.selectProject(projectId)
      }
    })
    
    // Modal buttons
    document.getElementById('createProjectBtn')?.addEventListener('click', () => this.createProject())
    
    // Modal close buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close')) {
        const modalId = e.target.getAttribute('data-modal')
        if (modalId) this.closeModal(modalId)
      }
    })
    
    // Enter key en modal de nuevo proyecto
    document.getElementById('newProjectName')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.createProject()
    })
    
    console.log('✅ Event listeners principales configurados')
  },

  setupEditorListeners() {
    // Search input
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.setSearchTerm(e.target.value)
    })
    
    // Add env button
    document.getElementById('addEnvBtn')?.addEventListener('click', () => {
      this.addEnv()
    })
    
    // Delegación de eventos para la lista de variables
    document.getElementById('envList')?.addEventListener('click', (e) => {
      const envItem = e.target.closest('.env-item')
      if (!envItem) return
      
      const index = parseInt(envItem.getAttribute('data-env-index'), 10)
      if (isNaN(index) || index < 0) return
      
      if (e.target.classList.contains('env-remove')) {
        this.removeEnv(index)
      } else if (e.target.classList.contains('env-duplicate')) {
        this.duplicateEnv(index)
      }
    })
    
    // Delegación para cambios en inputs
    document.getElementById('envList')?.addEventListener('change', (e) => {
      const envItem = e.target.closest('.env-item')
      if (!envItem) return
      
      const index = parseInt(envItem.getAttribute('data-env-index'), 10)
      if (isNaN(index) || index < 0) return
      
      if (e.target.classList.contains('env-toggle')) {
        this.toggleEnv(index)
      }
    })
    
    document.getElementById('envList')?.addEventListener('input', (e) => {
      const envItem = e.target.closest('.env-item')
      if (!envItem) return
      
      const index = parseInt(envItem.getAttribute('data-env-index'), 10)
      if (isNaN(index) || index < 0) return
      
      if (e.target.classList.contains('env-key')) {
        this.updateEnvKey(index, e.target.value)
      } else if (e.target.classList.contains('env-value')) {
        this.updateEnvValue(index, e.target.value)
      }
    })
  },

  setSearchTerm(term) {
    this.searchTerm = term || ''
    const envList = document.getElementById('envList')
    if (envList && this.currentProject) {
      // Ensure envs is an array
      if (!Array.isArray(this.currentProject.envs)) {
        this.currentProject.envs = []
      }
      
      const searchTermLower = this.searchTerm.toLowerCase()
      const filteredEnvs = this.currentProject.envs.filter(env => {
        if (!env) return false
        if (!this.searchTerm) return true
        
        const key = (env.key || '').toLowerCase()
        const value = (env.value || '').toLowerCase()
        return key.includes(searchTermLower) || value.includes(searchTermLower)
      })
      
      envList.innerHTML = this.renderEnvList(filteredEnvs)
      this.setupEditorListeners() // Re-configurar listeners después de renderizar
    }
  },

  addEnv() {
    if (!this.currentProject) return
    
    // Ensure envs is an array
    if (!Array.isArray(this.currentProject.envs)) {
      this.currentProject.envs = []
    }
    
    this.currentProject.envs.push({
      key: '',
      value: '',
      enabled: true
    })
    
    this.renderEditor()
  },

  removeEnv(index) {
    if (!this.currentProject) return
    if (!Array.isArray(this.currentProject.envs)) return
    if (index < 0 || index >= this.currentProject.envs.length) return
    
    if (confirm('¿Eliminar esta variable?')) {
      this.currentProject.envs.splice(index, 1)
      this.renderEditor()
    }
  },

  duplicateEnv(index) {
    if (!this.currentProject) return
    if (!Array.isArray(this.currentProject.envs)) return
    if (index < 0 || index >= this.currentProject.envs.length) return
    
    const env = this.currentProject.envs[index]
    if (!env) return
    
    this.currentProject.envs.splice(index + 1, 0, {
      key: (env.key || '') + '_COPY',
      value: env.value || '',
      enabled: env.enabled !== false
    })
    
    this.renderEditor()
  },

  toggleEnv(index) {
    if (!this.currentProject) return
    if (!Array.isArray(this.currentProject.envs)) return
    if (index < 0 || index >= this.currentProject.envs.length) return
    if (!this.currentProject.envs[index]) return
    
    this.currentProject.envs[index].enabled = !this.currentProject.envs[index].enabled
  },

  updateEnvKey(index, value) {
    if (!this.currentProject) return
    if (!Array.isArray(this.currentProject.envs)) return
    if (index < 0 || index >= this.currentProject.envs.length) return
    if (!this.currentProject.envs[index]) return
    
    this.currentProject.envs[index].key = value || ''
  },

  updateEnvValue(index, value) {
    if (!this.currentProject) return
    if (!Array.isArray(this.currentProject.envs)) return
    if (index < 0 || index >= this.currentProject.envs.length) return
    if (!this.currentProject.envs[index]) return
    
    this.currentProject.envs[index].value = value || ''
  },

  async saveProject() {
    if (!this.currentProject) return

    const descField = document.getElementById('projectDescription')
    if (descField) {
      this.currentProject.description = descField.value
    }

    const result = await window.electronAPI.saveProject(this.currentProject)
    
    if (result.success) {
      this.showNotification('Proyecto guardado correctamente', 'success')
      await this.loadProjects()
      this.selectProject(this.currentProject.id)
    } else {
      this.showNotification('Error al guardar: ' + result.error, 'error')
    }
  },

  async deleteProject() {
    if (!this.currentProject) return

    if (!confirm(`¿Eliminar el proyecto "${this.currentProject.name}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const result = await window.electronAPI.deleteProject(this.currentProject.id)
    
    if (result.success) {
      this.showNotification('Proyecto eliminado', 'success')
      this.currentProject = null
      await this.loadProjects()
      
      const container = document.getElementById('editorContainer')
      const title = document.getElementById('projectTitle')
      const actions = document.getElementById('headerActions')
      
      title.textContent = 'Selecciona un proyecto'
      actions.style.display = 'none'
      container.innerHTML = `
        <div class="empty-state">
          <h3>Proyecto eliminado</h3>
          <p>Selecciona otro proyecto o crea uno nuevo</p>
        </div>
      `
    } else {
      this.showNotification('Error al eliminar: ' + result.error, 'error')
    }
  },

  newProject() {
    document.getElementById('newProjectName').value = ''
    document.getElementById('newProjectDesc').value = ''
    this.openModal('newProjectModal')
  },

  async createProject() {
    const name = document.getElementById('newProjectName').value.trim()
    const description = document.getElementById('newProjectDesc').value.trim()

    if (!name) {
      this.showNotification('El nombre es requerido', 'error')
      return
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    if (this.projects.find(p => p.id === id)) {
      this.showNotification('Ya existe un proyecto con ese nombre', 'error')
      return
    }

    const project = {
      id,
      name,
      description,
      envs: [],
      createdAt: new Date().toISOString()
    }

    const result = await window.electronAPI.saveProject(project)
    
    if (result.success) {
      this.closeModal('newProjectModal')
      this.showNotification('Proyecto creado', 'success')
      await this.loadProjects()
      this.selectProject(id)
    } else {
      this.showNotification('Error al crear: ' + result.error, 'error')
    }
  },

  async importEnv() {
    if (!this.currentProject) return

    const result = await window.electronAPI.importEnvFile()
    
    if (result) {
      result.envs.forEach(env => {
        const exists = this.currentProject.envs.find(e => e.key === env.key)
        if (!exists) {
          this.currentProject.envs.push(env)
        }
      })
      
      this.showNotification(`Importadas ${result.envs.length} variables de ${result.filename}`, 'success')
      this.renderEditor()
    }
  },

  async exportEnv() {
    if (!this.currentProject) return

    const result = await window.electronAPI.exportEnvFile(
      this.currentProject.id,
      this.currentProject.envs
    )
    
    if (result.success) {
      this.showNotification('Archivo exportado correctamente', 'success')
    } else {
      this.showNotification('Error al exportar', 'error')
    }
  },

  async scanDirectory() {
    const result = await window.electronAPI.scanDirectory()
    
    if (!result) return

    if (result.files.length === 0) {
      this.showNotification('No se encontraron archivos .env', 'error')
      return
    }

    // Crear un proyecto por cada archivo .env encontrado
    for (const file of result.files) {
      const name = file.filename.replace('.env', '') || 'default'
      const id = `${path.basename(result.directory)}-${name}`.toLowerCase().replace(/[^a-z0-9]/g, '-')
      
      if (!this.projects.find(p => p.id === id)) {
        const project = {
          id,
          name: `${path.basename(result.directory)} - ${name}`,
          description: `Auto-detectado de ${result.directory || 'directorio'}`,
          envs: file.envs,
          createdAt: new Date().toISOString()
        }
        
        await window.electronAPI.saveProject(project)
      }
    }

    this.showNotification(`Detectados ${result.files.length} archivos .env`, 'success')
    await this.loadProjects()
  },

  async showBackups() {
    if (!this.currentProject) return

    const backups = await window.electronAPI.getBackups(this.currentProject.id)
    const list = document.getElementById('backupsList')
    if (!list) return

    if (!Array.isArray(backups) || backups.length === 0) {
      list.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-muted);">No hay backups disponibles</p>'
    } else {
      list.innerHTML = backups.map(backup => {
        if (!backup) return ''
        
        const dateStr = backup.date ? new Date(backup.date).toLocaleString() : 'Fecha desconocida'
        const filename = backup.filename || ''
        
        return `
          <div style="padding: 15px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 500;">${this.escapeHtml(dateStr)}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${this.escapeHtml(filename)}</div>
              </div>
              <button class="btn btn-primary btn-sm restore-backup-btn" data-filename="${this.escapeHtml(filename)}">
                Restaurar
              </button>
            </div>
          </div>
        `
      }).filter(Boolean).join('')

      // Agregar event listeners para los botones de restaurar
      document.querySelectorAll('.restore-backup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const filename = e.target.getAttribute('data-filename')
          if (filename) this.restoreBackup(filename)
        })
      })
    }

    this.openModal('backupsModal')
  },

  async restoreBackup(filename) {
    if (!this.currentProject) return

    if (!confirm('¿Restaurar este backup? Los cambios actuales se perderán.')) {
      return
    }

    const result = await window.electronAPI.restoreBackup(this.currentProject.id, filename)
    
    if (result.success) {
      this.closeModal('backupsModal')
      this.showNotification('Backup restaurado', 'success')
      await this.loadProjects()
      this.selectProject(this.currentProject.id)
    } else {
      this.showNotification('Error al restaurar: ' + result.error, 'error')
    }
  },

  openModal(id) {
    document.getElementById(id).classList.add('active')
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('active')
  },

  showNotification(message, type = 'success') {
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 3000)
  }
}

// Path helper for scan directory
const path = {
  basename(p) {
    return p.split(/[\\/]/).pop()
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  app.init()
})

// Close modals on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active')
    })
  }
})