// ======= Estado & Utilitários =======
const STORAGE_KEY = 'todo-vanilla-v1';
/** @type {{id:string, title:string, done:boolean}[]} */
let state = load() ?? seed();
let filter = 'all';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }
function seed() {
  const demo = [
    { id: uid(), title: 'Estudar JS (Curso em Vídeo)', done: false },
    { id: uid(), title: 'Construir esta To‑Do List', done: true },
    { id: uid(), title: 'Adicionar filtros e LocalStorage', done: false }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
  return demo;
}

// ======= DOM refs =======
const list = document.getElementById('list');
const tpl = document.getElementById('item-template');
const newTask = document.getElementById('newTask');
const counter = document.getElementById('counter');

const filterBtns = [...document.querySelectorAll('.filters button')];
filterBtns.forEach(btn => btn.addEventListener('click', () => {
  filter = btn.dataset.filter;
  filterBtns.forEach(b => b.classList.toggle('active', b === btn));
  filterBtns.forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'))
  render();
}))

document.getElementById('clearCompleted').addEventListener('click', () => {
  state = state.filter(t => !t.done); save(); render();
})

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'todos.json' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})

const fileInput = document.getElementById('fileInput');
document.getElementById('importBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const arr = JSON.parse(String(e.target.result));
      if (Array.isArray(arr) && arr.every(x => typeof x.title === 'string')) {
        state = arr.map(x => ({ id: x.id || uid(), title: x.title, done: !!x.done }));
        save(); render();
      } else alert('Ficheiro inválido.');
    } catch (err) { alert('Não foi possível ler o ficheiro.'); }
  };
  reader.readAsText(file);
  fileInput.value = '';
});

// ======= Add nova tarefa =======
newTask.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const title = newTask.value.trim();
    if (title.length) {
      state.unshift({ id: uid(), title, done: false });
      newTask.value = '';
      save(); render();
    }
  }
})

// ======= Renderização =======
function render() {
  list.innerHTML = '';
  const items = state.filter(t =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  );
  items.forEach(task => list.appendChild(viewItem(task)));
  const remaining = state.filter(t => !t.done).length;
  counter.textContent = `${state.length} tarefa${state.length !== 1 ? 's' : ''} • ${remaining} por concluir`;
}

function viewItem(task) {
  const node = tpl.content.firstElementChild.cloneNode(true);
  const check = node.querySelector('.check');
  const txt = node.querySelector('.txt');
  const input = node.querySelector('.edit');
  const editBtn = node.querySelector('.editBtn');
  const delBtn = node.querySelector('.deleteBtn');

  txt.textContent = task.title;
  if (task.done) node.classList.add('done');
  check.checked = task.done;

  // Toggle done
  check.addEventListener('change', () => {
    task.done = check.checked; save(); render();
  });

  // Delete
  delBtn.addEventListener('click', () => {
    state = state.filter(t => t.id !== task.id); save(); render();
  });

  // Start edit (button or double click)
  function startEdit() {
    input.classList.remove('sr-only'); input.classList.add('editing');
    input.value = task.title; txt.style.display = 'none'; input.focus();
    // Move cursor to end
    const val = input.value; input.value = ''; input.value = val;
  }
  editBtn.addEventListener('click', startEdit);
  txt.addEventListener('dblclick', startEdit);

  function finishEdit(commit) {
    input.classList.add('sr-only'); input.classList.remove('editing');
    txt.style.display = '';
    if (commit) {
      const v = input.value.trim(); if (v) { task.title = v; save(); render(); }
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finishEdit(true);
    if (e.key === 'Escape') finishEdit(false);
  });
  input.addEventListener('blur', () => finishEdit(true));

  // Drag & drop reorder
  node.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    node.style.opacity = .5;
  });
  node.addEventListener('dragend', () => { node.style.opacity = 1; });
  node.addEventListener('dragover', (e) => { e.preventDefault(); node.style.outline = '2px dashed rgba(255,255,255,.15)'; });
  node.addEventListener('dragleave', () => { node.style.outline = 'none'; });
  node.addEventListener('drop', (e) => {
    e.preventDefault(); node.style.outline = 'none';
    const fromId = e.dataTransfer.getData('text/plain');
    const toId = task.id;
    if (!fromId || fromId === toId) return;
    const fromIdx = state.findIndex(t => t.id === fromId);
    const toIdx = state.findIndex(t => t.id === toId);
    if (fromIdx > -1 && toIdx > -1) {
      const [moved] = state.splice(fromIdx, 1);
      state.splice(toIdx, 0, moved);
      save(); render();
    }
  });

  return node;
}

// Inicializar
render();