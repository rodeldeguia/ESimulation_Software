// public/js/quick-insert-panel.js
// Provides functions to insert colored boxes into the active editor

function insertColoredBox(type) {
  const editor = tinymce.activeEditor;
  if (!editor) return;
  const html = QUICK_TEMPLATES[type];
  if (html) editor.insertContent(html);
}