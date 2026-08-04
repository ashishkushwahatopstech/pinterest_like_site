/**
 * Responsive Breadcrumbs Navigation Component
 */
export const renderBreadcrumb = (items) => {
  if (!items || items.length === 0) return '';

  const linksHtml = items.map((item, index) => {
    const isLast = index === items.length - 1;
    if (isLast) {
      return `
        <li class="breadcrumb-item active" style="display: flex; align-items: center; color: var(--text-primary); font-weight: 700; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${item.icon ? `<span class="material-icons-outlined" style="font-size: 1rem; margin-right: 4px; color: var(--accent-primary); flex-shrink: 0;">${item.icon}</span>` : ''}
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.label}</span>
        </li>
      `;
    }

    return `
      <li class="breadcrumb-item" style="display: flex; align-items: center;">
        <a href="${item.url || '/'}" class="breadcrumb-link" style="display: flex; align-items: center; gap: 4px; color: var(--text-secondary); text-decoration: none; font-weight: 500; transition: color 0.2s ease;">
          ${item.icon ? `<span class="material-icons-outlined" style="font-size: 1rem; flex-shrink: 0;">${item.icon}</span>` : ''}
          <span style="white-space: nowrap;">${item.label}</span>
        </a>
        <span class="material-icons-outlined breadcrumb-separator" style="font-size: 0.9rem; color: var(--text-muted); margin: 0 6px; user-select: none; flex-shrink: 0;">chevron_right</span>
      </li>
    `;
  }).join('');

  return `
    <nav class="breadcrumb-container animate-fade" aria-label="Breadcrumb" style="margin-bottom: 24px; width: 100%;">
      <ol class="breadcrumb-list" style="display: inline-flex; align-items: center; list-style: none; padding: 8px 16px; margin: 0; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-full); font-size: 0.85rem; max-width: 100%; overflow-x: auto; scrollbar-width: none; box-shadow: var(--shadow-sm);">
        ${linksHtml}
      </ol>
    </nav>
  `;
};
