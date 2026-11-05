import './style.css'

const STORAGE_KEY = 'todo-app:tasks'
const PRIORITIES = {
  high: { label: '高', color: 'var(--c-error)', bg: 'var(--c-error-light)' },
  medium: { label: '中', color: 'var(--c-warning)', bg: '#fef3c7' },
  low: { label: '低', color: 'var(--c-success)', bg: 'var(--c-success-light)' },
}
const PRIORITY_ORDER = ['high', 'medium', 'low']

const app = document.querySelector('#app')

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

const state = {
  tasks: loadTasks(),
  filter: 'all', // all | active | done
  editingId: null,
  newPriority: 'medium',
}

function persist() {
  saveTasks(state.tasks)
}

function addTask(text) {
  const trimmed = text.trim()
  if (!trimmed) return
  state.tasks.unshift({
    id: Date.now() + Math.random().toString(16).slice(2),
    text: trimmed,
    done: false,
    priority: state.newPriority,
  })
  persist()
  render()
}

function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id)
  if (t) {
    t.done = !t.done
    persist()
    render()
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((x) => x.id !== id)
  if (state.editingId === id) state.editingId = null
  persist()
  render()
}

function editTask(id) {
  state.editingId = id
  render()
  const input = app.querySelector('.edit-input')
  if (input) {
    input.focus()
    input.select()
  }
}

function saveEdit(id, newText, newPriority) {
  const t = state.tasks.find((x) => x.id === id)
  if (t) {
    const trimmed = newText.trim()
    if (trimmed) {
      t.text = trimmed
      t.priority = newPriority
    }
  }
  state.editingId = null
  persist()
  render()
}

function cancelEdit() {
  state.editingId = null
  render()
}

function setPriority(id, priority) {
  const t = state.tasks.find((x) => x.id === id)
  if (t) {
    t.priority = priority
    persist()
    render()
  }
}

function clearDone() {
  if (!state.tasks.some((t) => t.done)) return
  state.tasks = state.tasks.filter((t) => !t.done)
  persist()
  render()
}

function clearAll() {
  if (state.tasks.length === 0) return
  state.tasks = []
  state.editingId = null
  persist()
  render()
}

function filteredTasks() {
  if (state.filter === 'active') return state.tasks.filter((t) => !t.done)
  if (state.filter === 'done') return state.tasks.filter((t) => t.done)
  return state.tasks
}

function sortedTasks(list) {
  return [...list].sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf(a.priority)
    const bi = PRIORITY_ORDER.indexOf(b.priority)
    if (ai !== bi) return ai - bi
    return 0
  })
}

const checkSvg =
  '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'

const trashSvg =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>'

const editSvg =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'

function priorityDot(p) {
  const cfg = PRIORITIES[p] || PRIORITIES.medium
  return `<span class="priority-dot" style="background:${cfg.color}" title="优先级：${cfg.label}"></span>`
}

function renderTodoItem(t) {
  const isEditing = state.editingId === t.id
  if (isEditing) {
    return `
      <li class="todo-item editing" data-id="${t.id}">
        ${priorityDot(t.priority)}
        <form class="edit-form" data-id="${t.id}">
          <input class="edit-input" type="text" value="${escapeAttr(t.text)}" maxlength="200" />
          <div class="edit-actions">
            <select class="edit-priority">
              ${PRIORITY_ORDER.map((p) => `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${PRIORITIES[p].label}</option>`).join('')}
            </select>
            <button type="submit" class="btn-save" aria-label="保存">✓</button>
            <button type="button" class="btn-cancel" data-action="cancel-edit" aria-label="取消">✕</button>
          </div>
        </form>
      </li>`
  }
  return `
    <li class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <label class="checkbox">
        <input type="checkbox" ${t.done ? 'checked' : ''} data-action="toggle" />
        <span class="box">${checkSvg}</span>
      </label>
      ${priorityDot(t.priority)}
      <span class="todo-text" data-action="edit">${escapeHtml(t.text)}</span>
      <button class="btn-icon btn-edit" data-action="edit" aria-label="编辑">${editSvg}</button>
      <button class="btn-icon btn-delete" data-action="delete" aria-label="删除任务">${trashSvg}</button>
    </li>`
}

function render() {
  const total = state.tasks.length
  const doneCount = state.tasks.filter((t) => t.done).length
  const activeCount = total - doneCount

  const list = sortedTasks(filteredTasks())

  const emptyMsg =
    total === 0
      ? '还没有任务，在上方输入框写下你的第一件事吧 ✨'
      : state.filter === 'done'
        ? '还没有已完成的任务'
        : state.filter === 'active'
          ? '没有未完成的任务，太棒了！🎉'
          : '当前筛选下没有任务'

  const emptyIcon = total === 0 ? '🗒️' : '🔍'

  const listHtml =
    list.length === 0
      ? `<div class="empty">
           <div class="empty-icon">${emptyIcon}</div>
           <p>${emptyMsg}</p>
         </div>`
      : `<ul class="todo-list">${list.map(renderTodoItem).join('')}</ul>`

  app.innerHTML = `
    <header class="app-header">
      <h1 class="app-title"><span class="app-icon">📝</span>我的待办清单</h1>
      <p class="app-subtitle">记录每一件要做的事，完成后轻松划掉</p>
    </header>

    <section class="stats">
      <div class="stat">
        <span class="stat-value active">${activeCount}</span>
        <span class="stat-label">未完成</span>
      </div>
      <div class="stat">
        <span class="stat-value done">${doneCount}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat">
        <span class="stat-value total">${total}</span>
        <span class="stat-label">全部任务</span>
      </div>
    </section>

    <section class="card">
      <form class="input-row" id="todo-form">
        <input type="text" id="todo-input" placeholder="今天要做什么？" autocomplete="off" maxlength="200" />
        <select id="priority-select" aria-label="优先级">
          ${PRIORITY_ORDER.map((p) => `<option value="${p}" ${state.newPriority === p ? 'selected' : ''}>${PRIORITIES[p].label}优先级</option>`).join('')}
        </select>
        <button type="submit" class="btn-add">➕ 添加任务</button>
      </form>

      <div class="filters">
        <button class="filter-btn ${state.filter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
        <button class="filter-btn ${state.filter === 'active' ? 'active' : ''}" data-filter="active">未完成</button>
        <button class="filter-btn ${state.filter === 'done' ? 'active' : ''}" data-filter="done">已完成</button>
      </div>

      ${listHtml}
    </section>

    <footer class="app-footer">
      <button id="clear-done">🧹 清空已完成</button>
      <span class="footer-sep">|</span>
      <button id="clear-all" class="danger">🗑️ 全部清空</button>
    </footer>

    <div class="modal-overlay" id="confirm-modal" hidden>
      <div class="modal">
        <div class="modal-icon">⚠️</div>
        <h3 class="modal-title">确认全部清空？</h3>
        <p class="modal-text">这将删除所有任务（包括未完成的），此操作无法撤销。</p>
        <div class="modal-actions">
          <button class="modal-btn modal-cancel" id="modal-cancel">取消</button>
          <button class="modal-btn modal-confirm" id="modal-confirm">确认清空</button>
        </div>
      </div>
    </div>
  `

  bindEvents()
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(str) {
  return escapeHtml(str)
}

function openConfirm() {
  const modal = app.querySelector('#confirm-modal')
  modal.hidden = false
  app.querySelector('#modal-cancel').focus()
}

function closeConfirm() {
  const modal = app.querySelector('#confirm-modal')
  modal.hidden = true
}

function bindEvents() {
  const form = app.querySelector('#todo-form')
  const input = app.querySelector('#todo-input')
  const prioritySelect = app.querySelector('#priority-select')

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    addTask(input.value)
    input.value = ''
    input.focus()
  })

  prioritySelect.addEventListener('change', (e) => {
    state.newPriority = e.target.value
  })

  app.querySelectorAll('[data-action="toggle"]').forEach((el) => {
    el.addEventListener('change', (e) => {
      toggleTask(e.target.closest('.todo-item').dataset.id)
    })
  })

  app.querySelectorAll('[data-action="delete"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      deleteTask(e.currentTarget.closest('.todo-item').dataset.id)
    })
  })

  app.querySelectorAll('[data-action="edit"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      editTask(e.currentTarget.closest('.todo-item').dataset.id)
    })
  })

  // Edit form (submit = save, cancel button, escape key)
  app.querySelectorAll('.edit-form').forEach((formEl) => {
    formEl.addEventListener('submit', (e) => {
      e.preventDefault()
      const id = formEl.dataset.id
      const text = formEl.querySelector('.edit-input').value
      const priority = formEl.querySelector('.edit-priority').value
      saveEdit(id, text, priority)
    })
  })

  app.querySelectorAll('[data-action="cancel-edit"]').forEach((el) => {
    el.addEventListener('click', () => cancelEdit())
  })

  app.querySelector('.edit-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  })

  app.querySelectorAll('.filter-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.filter = el.dataset.filter
      render()
    })
  })

  app.querySelector('#clear-done').addEventListener('click', clearDone)
  app.querySelector('#clear-all').addEventListener('click', () => {
    if (state.tasks.length === 0) return
    openConfirm()
  })

  app.querySelector('#modal-cancel').addEventListener('click', closeConfirm)
  app.querySelector('#modal-confirm').addEventListener('click', () => {
    closeConfirm()
    clearAll()
  })

  // Close modal when clicking the overlay
  app.querySelector('#confirm-modal').addEventListener('click', (e) => {
    if (e.target.id === 'confirm-modal') closeConfirm()
  })
}

render()
