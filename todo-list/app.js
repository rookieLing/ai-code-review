(function () {
  const STORAGE_KEY = "todo_list_items_v1";

  /**
   * @typedef {{ id: string, title: string, completed: boolean, createdAt: number, priority: "high" | "medium" | "low", dueDate?: number, desc?: string }} TodoItem
   */

  /** @type {TodoItem[]} */
  let allItems = [];
  /** @type {"all" | "active" | "completed" | "overdue" | "today" | "upcoming"} */
  let currentFilter = "all";
  /** @type {boolean} */
  let sortByPriorityEnabled = false;
  /** @type {boolean} */
  let sortByDueDateEnabled = false;
  /** @type {number | null} */
  let notificationCheckInterval = null;
  /** @type {string} */
  let searchQuery = "";

  const $input = document.getElementById("new-todo-input");
  const $dueDateInput = document.getElementById("due-date-input");
  const $descInput = document.getElementById("desc-input");
  const $add = document.getElementById("add-todo-button");
  const $list = document.getElementById("todo-list");
  const $stats = document.getElementById("todo-stats");
  const $filters = document.querySelectorAll(".filter-button[data-filter]");
  const $clearCompleted = document.getElementById("clear-completed");
  const $sortByPriority = document.getElementById("sort-by-priority");
  const $sortByDueDate = document.getElementById("sort-by-due-date");
  const $searchInput = document.getElementById("search-input");
  const $clearSearch = document.getElementById("clear-search");

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
          priority: item.priority || "medium",
          dueDate: item.dueDate || undefined,
          desc: item.desc || undefined
        }));
      }
    } catch (err) {
      // ignore parse errors
    }
    return [];
  }

  function getFilteredItems() {
    let items;
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);
    
    switch (currentFilter) {
      case "active":
        items = allItems.filter((x) => !x.completed);
        break;
      case "completed":
        items = allItems.filter((x) => x.completed);
        break;
      case "overdue":
        items = allItems.filter((x) => 
          !x.completed && x.dueDate && x.dueDate < now
        );
        break;
      case "today":
        items = allItems.filter((x) => 
          !x.completed && x.dueDate && 
          x.dueDate >= todayStart && x.dueDate <= todayEnd
        );
        break;
      case "upcoming":
        items = allItems.filter((x) => 
          !x.completed && x.dueDate && x.dueDate > todayEnd
        );
        break;
      default:
        items = allItems;
    }
    
    // 应用搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      items = items.filter((x) => x.title.toLowerCase().includes(query));
    }
    
    if (sortByDueDateEnabled) {
      return sortByDueDate(items);
    } else if (sortByPriorityEnabled) {
      return sortByPriority(items);
    }
    return items;
  }

  function updateStats() {
    const total = allItems.length;
    const active = allItems.filter((x) => !x.completed).length;
    const overdue = allItems.filter((x) => 
      !x.completed && x.dueDate && x.dueDate < Date.now()
    ).length;
    let statsText = `${active} 项待办（共 ${total} 项）`;
    if (overdue > 0) {
      statsText += `，${overdue} 项已逾期`;
    }
    $stats.textContent = statsText;
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) {
      return "今天";
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return "明天";
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }

  function isOverdue(dueDate) {
    if (!dueDate) return false;
    return !isNaN(dueDate) && dueDate < Date.now();
  }

  function highlightText(text, query) {
    if (!query || !query.trim()) {
      return text;
    }
    
    const queryLower = query.trim().toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);
    
    if (index === -1) {
      return text;
    }
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    const span = document.createElement("span");
    span.className = "search-highlight";
    span.textContent = match;
    
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(before));
    fragment.appendChild(span);
    fragment.appendChild(document.createTextNode(after));
    
    return fragment;
  }

  function render() {
    const items = getFilteredItems();
    $list.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      const overdue = !item.completed && isOverdue(item.dueDate);
      li.className = `todo-item${item.completed ? " completed" : ""} priority-${item.priority}${overdue ? " overdue" : ""}`;
      li.dataset.id = item.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.completed;
      checkbox.addEventListener("change", () => toggleItem(item.id));

      const contentWrapper = document.createElement("div");
      contentWrapper.className = "todo-content";

      const title = document.createElement("div");
      title.className = "title";
      title.title = item.title;
      
      // 高亮匹配的文本
      if (searchQuery.trim()) {
        const highlighted = highlightText(item.title, searchQuery);
        if (highlighted instanceof DocumentFragment) {
          title.appendChild(highlighted);
        } else {
          title.textContent = item.title;
        }
      } else {
        title.textContent = item.title;
      }
      
      title.addEventListener("dblclick", () => startEdit(item.id, title));

      const dueDateDisplay = document.createElement("div");
      dueDateDisplay.className = "due-date-display";
      if (item.dueDate) {
        const dateStr = formatDate(item.dueDate);
        dueDateDisplay.textContent = overdue ? `⚠️ ${dateStr}（已逾期）` : `📅 ${dateStr}`;
        dueDateDisplay.className += overdue ? " overdue-text" : "";
      } else {
        dueDateDisplay.textContent = "";
      }

      // 描述区域 - 故意写一些有问题的代码
      let descDiv = null;
      let expandBtn = null;
      if (item.desc) {
        descDiv = document.createElement("div");
        descDiv.className = "todo-desc";
        descDiv.style.display = "none";
        descDiv.textContent = item.desc;
        
        expandBtn = document.createElement("button");
        expandBtn.className = "expand-btn";
        expandBtn.textContent = "展开";
        expandBtn.onclick = function() {
          if (descDiv.style.display == "none") {
            descDiv.style.display = "block";
            expandBtn.textContent = "收起";
          } else {
            descDiv.style.display = "none";
            expandBtn.textContent = "展开";
          }
        };
        
        const descWrapper = document.createElement("div");
        descWrapper.className = "desc-wrapper";
        descWrapper.appendChild(expandBtn);
        descWrapper.appendChild(descDiv);
        contentWrapper.appendChild(descWrapper);
      }

      contentWrapper.appendChild(title);
      contentWrapper.appendChild(dueDateDisplay);

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

      const dueDateBtn = document.createElement("button");
      dueDateBtn.className = "icon-button due-date-button";
      dueDateBtn.setAttribute("aria-label", "设置截止日期");
      dueDateBtn.textContent = "📅";
      dueDateBtn.title = item.dueDate ? "修改截止日期" : "设置截止日期";
      dueDateBtn.addEventListener("click", () => showDueDatePicker(item.id));

      const descBtn = document.createElement("button");
      descBtn.className = "icon-button desc-button";
      descBtn.textContent = item.desc ? "📝" : "📄";
      descBtn.title = item.desc ? "编辑描述" : "添加描述";
      descBtn.onclick = () => editDesc(item.id);

      const editBtn = document.createElement("button");
      editBtn.className = "icon-button edit-button";
      editBtn.setAttribute("aria-label", "编辑");
      editBtn.textContent = "✎";
      editBtn.addEventListener("click", () => startEdit(item.id, title));

      const delBtn = document.createElement("button");
      delBtn.className = "icon-button";
      delBtn.setAttribute("aria-label", "删除");
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => deleteItem(item.id));

      actions.appendChild(prioritySelect);
      actions.appendChild(dueDateBtn);
      actions.appendChild(descBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(checkbox);
      li.appendChild(contentWrapper);
      li.appendChild(actions);
      $list.appendChild(li);
    }

    updateStats();
  }

  function addItem(title, priority = "medium", dueDate = null, desc = "") {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newItem = {
      id: generateId(),
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
      priority: priority || "medium",
      dueDate: dueDate || undefined,
      desc: desc || undefined,
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

  function editItem(id, newTitle) {
    const target = allItems.find((x) => x.id === id);
    if (!target) return;
    const trimmed = newTitle.trim();
    if (!trimmed) return; // 不允许空标题
    target.title = trimmed;
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

  function sortByDueDate(items) {
    return [...items].sort((a, b) => {
      // 没有截止日期的排在最后
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  }

  function setDueDate(id, dueDate) {
    const target = allItems.find((x) => x.id === id);
    if (!target) return;
    if (dueDate) {
      target.dueDate = dueDate;
    } else {
      delete target.dueDate;
    }
    saveAndRender();
  }

  function showDueDatePicker(id) {
    const item = allItems.find((x) => x.id === id);
    if (!item) return;

    const currentDate = item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '';
    const newDate = prompt(
      `设置截止日期（格式：YYYY-MM-DD）\n留空或输入"清除"可删除截止日期：`,
      currentDate
    );

    if (newDate === null) return; // 用户取消

    if (newDate.trim() === '' || newDate.trim().toLowerCase() === '清除') {
      setDueDate(id, null);
      return;
    }

    const date = new Date(newDate + 'T23:59:59');
    if (isNaN(date.getTime())) {
      alert('日期格式不正确，请使用 YYYY-MM-DD 格式');
      return;
    }

    setDueDate(id, date.getTime());
  }

  // 编辑描述 - 故意写一些有问题的代码
  function editDesc(id) {
    const x = allItems.find((y) => y.id === id);
    if (!x) return;
    
    const oldDesc = x.desc || "";
    const newDesc = prompt("输入任务描述（留空删除）：", oldDesc);
    
    if (newDesc === null) return;
    
    if (newDesc.length > 500) {
      alert("描述太长");
      return;
    }
    
    if (newDesc.trim() == "") {
      delete x.desc;
    } else {
      x.desc = newDesc;
    }
    
    saveAndRender();
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
      sortByDueDateEnabled = false;
      if ($sortByDueDate) {
        $sortByDueDate.classList.remove("active");
        $sortByDueDate.textContent = "按截止日期排序";
      }
      $sortByPriority.classList.add("active");
      $sortByPriority.textContent = "取消排序";
    } else {
      $sortByPriority.classList.remove("active");
      $sortByPriority.textContent = "按优先级排序";
    }
    render();
  }

  function toggleSortByDueDate() {
    if (!$sortByDueDate) return;
    sortByDueDateEnabled = !sortByDueDateEnabled;
    if (sortByDueDateEnabled) {
      sortByPriorityEnabled = false;
      $sortByPriority.classList.remove("active");
      $sortByPriority.textContent = "按优先级排序";
      $sortByDueDate.classList.add("active");
      $sortByDueDate.textContent = "取消排序";
    } else {
      $sortByDueDate.classList.remove("active");
      $sortByDueDate.textContent = "按截止日期排序";
    }
    render();
  }

  function startEdit(id, titleElement) {
    const item = allItems.find((x) => x.id === id);
    if (!item) return;

    // 如果已经在编辑模式，不重复进入
    if (titleElement.classList.contains("editing")) return;

    const originalText = item.title;
    titleElement.classList.add("editing");
    
    // 创建输入框
    const input = document.createElement("input");
    input.type = "text";
    input.className = "edit-input";
    input.value = originalText;
    input.setAttribute("aria-label", "编辑待办事项");

    // 保存原始内容（使用 item.title 而不是 textContent，因为 textContent 可能包含高亮）
    let originalContent = item.title;
    titleElement.textContent = "";
    titleElement.appendChild(input);
    input.focus();
    input.select();

    // 保存编辑
    function saveEdit() {
      const newValue = input.value.trim();
      if (newValue && newValue !== originalText) {
        editItem(id, newValue);
      } else {
        // 如果为空或未改变，重新渲染以恢复高亮
        titleElement.classList.remove("editing");
        render();
      }
    }

    // 取消编辑
    function cancelEdit() {
      titleElement.classList.remove("editing");
      render();
    }

    // 事件处理
    input.addEventListener("blur", saveEdit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur(); // 触发 blur 事件保存
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    });
  }

  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function checkDueDateNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    allItems.forEach(item => {
      if (item.completed || !item.dueDate) return;
      
      const timeUntilDue = item.dueDate - now;
      // 在截止日期前1小时内提醒，且只提醒一次
      if (timeUntilDue > 0 && timeUntilDue <= oneHour && !item.notified) {
        new Notification("待办事项即将到期", {
          body: `"${item.title}" 将在 ${Math.round(timeUntilDue / 60000)} 分钟后到期`,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
          tag: item.id,
          requireInteraction: false
        });
        // 标记为已提醒（可选，如果需要多次提醒可以移除）
        item.notified = true;
        saveToStorage();
      }
      
      // 已逾期的提醒
      if (timeUntilDue < 0 && !item.overdueNotified) {
        new Notification("待办事项已逾期", {
          body: `"${item.title}" 已逾期`,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'><path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'/></svg>",
          tag: `overdue-${item.id}`,
          requireInteraction: false
        });
        item.overdueNotified = true;
        saveToStorage();
      }
    });
  }

  function startNotificationCheck() {
    if (notificationCheckInterval) {
      clearInterval(notificationCheckInterval);
    }
    // 每分钟检查一次
    notificationCheckInterval = setInterval(checkDueDateNotifications, 60000);
    // 立即检查一次
    checkDueDateNotifications();
  }

  function bindEvents() {
    $add.addEventListener("click", () => {
      const dueDateValue = $dueDateInput.value;
      const dueDate = dueDateValue ? new Date(dueDateValue + 'T23:59:59').getTime() : null;
      const descValue = $descInput ? $descInput.value : "";
      addItem($input.value, "medium", dueDate, descValue);
      $input.value = "";
      $dueDateInput.value = "";
      if ($descInput) $descInput.value = "";
      $input.focus();
    });

    $input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const dueDateValue = $dueDateInput.value;
        const dueDate = dueDateValue ? new Date(dueDateValue + 'T23:59:59').getTime() : null;
        const descValue = $descInput ? $descInput.value : "";
        addItem($input.value, "medium", dueDate, descValue);
        $input.value = "";
        $dueDateInput.value = "";
        if ($descInput) $descInput.value = "";
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
    if ($sortByDueDate) {
      $sortByDueDate.addEventListener("click", toggleSortByDueDate);
    }

    // 搜索功能
    if ($searchInput) {
      $searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        updateClearSearchButton();
        render();
      });

      $searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          clearSearch();
        }
      });
    }

    if ($clearSearch) {
      $clearSearch.addEventListener("click", clearSearch);
    }
  }

  function updateClearSearchButton() {
    if (!$clearSearch) return;
    if (searchQuery.trim()) {
      $clearSearch.style.display = "inline-flex";
    } else {
      $clearSearch.style.display = "none";
    }
  }

  function clearSearch() {
    if ($searchInput) {
      $searchInput.value = "";
      searchQuery = "";
      updateClearSearchButton();
      render();
      $searchInput.focus();
    }
  }

  function init() {
    allItems = loadFromStorage();
    bindEvents();
    render();
    requestNotificationPermission();
    startNotificationCheck();
  }

  init();
})();


