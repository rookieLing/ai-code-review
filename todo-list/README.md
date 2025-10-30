# Todo List

一个无需构建、可直接本地打开的 Todo List（HTML/CSS/JS）。支持新增、勾选完成、删除、过滤、清除已完成，并持久化到浏览器 localStorage。

## 使用方法

- 直接双击打开 `index.html` 即可使用（建议使用 Chrome/Edge 最新版）。
- 输入框输入待办后，点击“添加”或回车键添加。
- 点击复选框切换完成状态；点击“✕”删除条目。
- 顶部可切换过滤：全部 / 未完成 / 已完成；可一键清除已完成。

## 文件结构

- `index.html`：页面结构与挂载点
- `styles.css`：样式与布局
- `app.js`：业务逻辑与 localStorage 持久化

## 数据持久化

- 本地存储键：`todo_list_items_v1`
- 清理浏览器缓存可能导致数据丢失，请注意备份。

## 兼容性

- 现代浏览器（Chrome/Edge/Firefox/Safari 最新版本）。
