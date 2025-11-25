(function () {
  const STORAGE_KEY = "todo_list_items_v1";

  /**
   * @typedef {{ id: string, title: string, completed: boolean, createdAt: number, priority: "high" | "medium" | "low" }} TodoItem
   */

  /** @type {TodoItem[]} */
  let allItems = [];
  /** @type {"all" | "active" | "completed"} */
  let currentFilter = "all";
  /** @type {boolean} */
  let sortByPriorityEnabled = false;

  const $input = document.getElementById("new-todo-input");
  const $add = document.getElementById("add-todo-button");
  const $list = document.getElementById("todo-list");
  const $stats = document.getElementById("todo-stats");
  const $filters = document.querySelectorAll(".filter-button[data-filter]");
  const $clearCompleted = document.getElementById("clear-completed");
  const $sortByPriority = document.getElementById("sort-by-priority");

  function generateId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allItems));
    } catch (err) {
      // ignore quota errors
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // 兼容旧数据：缺失 priority 字段时设为 "medium"
        return parsed.map(item => ({
          ...item,
          priority: item.priority || "medium"
        }));
      }
    } catch (err) {
      // ignore parse errors
    }
    return [];
  }

  function getFilteredItems() {
    let items;
    switch (currentFilter) {
      case "active":
        items = allItems.filter((x) => !x.completed);
        break;
      case "completed":
        items = allItems.filter((x) => x.completed);
        break;
      default:
        items = allItems;
    }
    if (sortByPriorityEnabled) {
      return sortByPriority(items);
    }
    return items;
  }

  function updateStats() {
    const total = allItems.length;
    const active = allItems.filter((x) => !x.completed).length;
    $stats.textContent = `${active} 项待办（共 ${total} 项）`;
  }

  function render() {
    const items = getFilteredItems();
    $list.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      li.className = `todo-item${item.completed ? " completed" : ""} priority-${item.priority}`;
      li.dataset.id = item.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.completed;
      checkbox.addEventListener("change", () => toggleItem(item.id));

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = item.title;
      title.title = item.title;

      const prioritySelect = document.createElement("select");
      prioritySelect.className = "priority-select";
      prioritySelect.setAttribute("aria-label", "优先级");
      prioritySelect.value = item.priority;
      prioritySelect.addEventListener("change", (e) => {
        setPriority(item.id, e.target.value);
      });

      const priorities = [
        { value: "high", label: "高" },
        { value: "medium", label: "中" },
        { value: "low", label: "低" }
      ];
      priorities.forEach(p => {
        const option = document.createElement("option");
        option.value = p.value;
        option.textContent = p.label;
        prioritySelect.appendChild(option);
      });

      const actions = document.createElement("div");
      actions.className = "todo-actions";

      const delBtn = document.createElement("button");
      delBtn.className = "icon-button";
      delBtn.setAttribute("aria-label", "删除");
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => deleteItem(item.id));

      actions.appendChild(prioritySelect);
      actions.appendChild(delBtn);

      li.appendChild(checkbox);
      li.appendChild(title);
      li.appendChild(actions);
      $list.appendChild(li);
    }

    updateStats();
  }

  function addItem(title, priority = "medium") {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newItem = {
      id: generateId(),
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
      priority: priority || "medium",
    };
    allItems.unshift(newItem);
    saveAndRender();
  }

  function toggleItem(id) {
    const target = allItems.find((x) => x.id === id);
    if (!target) return;
    target.completed = !target.completed;
    saveAndRender();
  }

  function deleteItem(id) {
    allItems = allItems.filter((x) => x.id !== id);
    saveAndRender();
  }

  function setPriority(id, priority) {
    const target = allItems.find((x) => x.id === id);
    if (!target) return;
    target.priority = priority;
    saveAndRender();
  }

  function getPriorityOrder(priority) {
    const order = { high: 3, medium: 2, low: 1 };
    return order[priority] || 2;
  }

  function sortByPriority(items) {
    return [...items].sort((a, b) => {
      return getPriorityOrder(b.priority) - getPriorityOrder(a.priority);
    });
  }

  function clearCompleted() {
    allItems = allItems.filter((x) => !x.completed);
    saveAndRender();
  }

  function saveAndRender() {
    saveToStorage();
    render();
  }

  function setFilter(next) {
    currentFilter = next;
    document.querySelectorAll(".filter-button[data-filter]").forEach((btn) => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`.filter-button[data-filter="${next}"]`);
    if (activeBtn) activeBtn.classList.add("active");
    render();
  }

  function toggleSortByPriority() {
    sortByPriorityEnabled = !sortByPriorityEnabled;
    if (sortByPriorityEnabled) {
      $sortByPriority.classList.add("active");
      $sortByPriority.textContent = "取消排序";
    } else {
      $sortByPriority.classList.remove("active");
      $sortByPriority.textContent = "按优先级排序";
    }
    render();
  }

  function bindEvents() {
    $add.addEventListener("click", () => {
      addItem($input.value);
      $input.value = "";
      $input.focus();
    });

    $input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addItem($input.value);
        $input.value = "";
      }
    });

    $filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = btn.getAttribute("data-filter");
        setFilter(/** @type {any} */ (f));
      });
    });

    $clearCompleted.addEventListener("click", clearCompleted);
    $sortByPriority.addEventListener("click", toggleSortByPriority);
  }

  function init() {
    allItems = loadFromStorage();
    bindEvents();
    render();
  }

  init();
})();


