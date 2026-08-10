import { getOptimizedImageUrl } from '../utils/image';
import { extractDestinationUrl, getDomainFromUrl } from '../utils/privacy';

const escapeAttr = (str) => {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

export const renderViewModeSwitcher = (activeMode = 'grid') => {
  return `
    <div class="view-mode-switcher-bar" style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 20px; width: 100%;">
      <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Display:</span>
      <div style="display: flex; background: var(--bg-secondary); padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <button type="button" class="btn-view-mode ${activeMode === 'grid' ? 'active' : ''}" data-mode="grid" title="Masonry Grid View" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; background: ${activeMode === 'grid' ? 'var(--accent-gradient)' : 'transparent'}; color: ${activeMode === 'grid' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s ease;">
          <span class="material-icons-outlined" style="font-size: 1.1rem;">grid_view</span>
          <span>Grid</span>
        </button>
        <button type="button" class="btn-view-mode ${activeMode === 'list' ? 'active' : ''}" data-mode="list" title="Detailed List View" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; background: ${activeMode === 'list' ? 'var(--accent-gradient)' : 'transparent'}; color: ${activeMode === 'list' ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s ease;">
          <span class="material-icons-outlined" style="font-size: 1.1rem;">view_list</span>
          <span>List</span>
        </button>
      </div>
    </div>
  `;
};

export const renderMasonryGrid = (images, hasMore = false, gridId = 'gallery-masonry-grid', showLoadMoreButton = false) => {
  if (!images || images.length === 0) {
    return `
      <div style="text-align: center; padding: 80px 24px; color: var(--text-secondary); width: 100%;">
        <span class="material-icons-outlined" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 16px;">image_not_supported</span>
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No images found</h3>
        <p style="font-size: 0.95rem;">Be the first to upload an image or select another board.</p>
      </div>
    `;
  }

  const itemsHtml = images.map(img => {
    const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
    const imageUrl = getOptimizedImageUrl(rawUrl, 600);
    const destUrl = extractDestinationUrl(img.description);
    const isLiked = window.appState?.userLikesSet ? window.appState.userLikesSet.has(img.id) : (img.is_liked || false);
    const viewsCount = img.views_count ?? 0;
    const likesCount = img.likes_count ?? 0;
    const altText = escapeAttr(img.alt_text || img.title || 'PinGrid image');
    
    return `
      <div class="masonry-item animate-fade" data-id="${img.id}">
        <div class="pin-card">
          <div class="pin-image-wrapper">
            <img src="${imageUrl}" alt="${altText}" loading="lazy" decoding="async">
          </div>
          <div class="pin-overlay">
            <div class="pin-top-actions">
              ${img.boards ? `
                <span class="pin-board-badge">${img.boards.name}</span>
              ` : '<span></span>'}
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="pin-views-badge" title="${viewsCount} views">
                  <span class="material-icons-outlined" style="font-size: 0.85rem; vertical-align: middle;">visibility</span>
                  <span class="views-count-label" style="vertical-align: middle; margin-left: 2px;">${viewsCount}</span>
                </span>
                <button class="pin-save-btn btn-like ${isLiked ? 'btn-primary liked' : 'btn-secondary'}" data-id="${img.id}" aria-label="Like image" title="${isLiked ? 'Unlike' : 'Like'}">
                  <span class="material-icons-outlined" style="font-size: 1rem; vertical-align: middle;">${isLiked ? 'favorite' : 'favorite_border'}</span>
                  <span class="likes-count-label" style="vertical-align: middle; margin-left: 2px;">${likesCount}</span>
                </button>
              </div>
            </div>
            <div class="pin-bottom-info">
              <h4 class="pin-title">${img.title}</h4>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                <div class="pin-author">
                  <img src="${img.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="pin-author-img" alt="${escapeAttr(img.users?.display_name || 'Creator')} Avatar">
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">
                    ${img.users?.display_name || 'Anonymous'}
                  </span>
                </div>
                ${destUrl ? `
                  <a href="${destUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-glass btn-sm" style="font-size: 0.7rem; padding: 4px 8px; border-radius: var(--radius-full); text-decoration: none; color: #fff; background: var(--accent-gradient); display: inline-flex; align-items: center; gap: 4px; box-shadow: var(--shadow-sm);" onclick="event.stopPropagation();" title="Visit ${destUrl}">
                    <span class="material-icons-outlined" style="font-size: 0.8rem;">open_in_new</span>
                    <span>Visit</span>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="masonry-grid" id="${gridId}">
      ${itemsHtml}
    </div>
    ${hasMore ? (showLoadMoreButton ? `
      <div id="load-more-container" style="display: flex; justify-content: center; padding: 40px 0; width: 100%;">
        <button id="load-more-btn" class="btn btn-primary animate-fade" style="padding: 14px 32px; border-radius: var(--radius-md); font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: var(--shadow-md); cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <span class="material-icons-outlined">expand_more</span>
          <span>Load More Gallery Images</span>
        </button>
      </div>
    ` : `
      <div id="infinite-scroll-sentinel" style="display: flex; justify-content: center; padding: 40px 0; width: 100%;">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 50%; display: inline-block;"></div>
      </div>
    `) : ''}
  `;
};

export const renderListView = (images, hasMore = false, listId = 'gallery-list-view', showLoadMoreButton = false) => {
  if (!images || images.length === 0) {
    return `
      <div style="text-align: center; padding: 80px 24px; color: var(--text-secondary); width: 100%;">
        <span class="material-icons-outlined" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 16px;">image_not_supported</span>
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No images found</h3>
        <p style="font-size: 0.95rem;">Be the first to upload an image or select another board.</p>
      </div>
    `;
  }

  const itemsHtml = images.map(img => {
    const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
    const imageUrl = getOptimizedImageUrl(rawUrl, 400);
    const destUrl = extractDestinationUrl(img.description);
    const isLiked = window.appState?.userLikesSet ? window.appState.userLikesSet.has(img.id) : (img.is_liked || false);
    const viewsCount = img.views_count ?? 0;
    const likesCount = img.likes_count ?? 0;
    const altText = escapeAttr(img.alt_text || img.title || 'PinGrid image');

    return `
      <div class="gallery-list-card animate-fade" data-id="${img.id}">
        <img src="${imageUrl}" alt="${altText}" class="gallery-list-thumb" loading="lazy" decoding="async">
        
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${img.title}
            </h4>
            ${img.boards ? `
              <span class="btn-glass" style="padding: 2px 8px; font-size: 0.7rem; border-radius: var(--radius-full); font-weight: 600; color: var(--accent-primary); border: 1px solid rgba(255,51,102,0.3); background: rgba(255,51,102,0.1);">
                ${img.boards.name}
              </span>
            ` : ''}
          </div>

          <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${img.alt_text ? `<strong style="color: var(--text-primary);">Alt:</strong> ${img.alt_text}` : (img.description || 'No description provided.')}
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 4px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary);">
                <img src="${img.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" alt="Avatar">
                <span style="font-weight: 600; color: var(--text-primary);">${img.users?.display_name || 'Anonymous'}</span>
                ${img.users?.username ? `<span style="color: var(--accent-primary); font-size: 0.75rem;">@${img.users.username}</span>` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 0.75rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-outlined" style="font-size: 0.9rem;">visibility</span>
                <span class="views-count-label">${viewsCount}</span>
              </span>

              <button class="pin-save-btn btn-like ${isLiked ? 'btn-primary liked' : 'btn-secondary'}" data-id="${img.id}" aria-label="Like image" title="${isLiked ? 'Unlike' : 'Like'}" style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-full);">
                <span class="material-icons-outlined" style="font-size: 0.9rem; vertical-align: middle;">${isLiked ? 'favorite' : 'favorite_border'}</span>
                <span class="likes-count-label" style="vertical-align: middle; margin-left: 2px;">${likesCount}</span>
              </button>

              ${destUrl ? `
                <a href="${destUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-glass btn-sm" style="font-size: 0.7rem; padding: 4px 8px; border-radius: var(--radius-full); text-decoration: none; color: #fff; background: var(--accent-gradient); display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
                  <span class="material-icons-outlined" style="font-size: 0.8rem;">open_in_new</span>
                  <span>Visit</span>
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="gallery-list-view" id="${listId}">
      ${itemsHtml}
    </div>
    ${hasMore ? (showLoadMoreButton ? `
      <div id="load-more-container" style="display: flex; justify-content: center; padding: 40px 0; width: 100%;">
        <button id="load-more-btn" class="btn btn-primary animate-fade" style="padding: 14px 32px; border-radius: var(--radius-md); font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: var(--shadow-md); cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <span class="material-icons-outlined">expand_more</span>
          <span>Load More Gallery Images</span>
        </button>
      </div>
    ` : `
      <div id="infinite-scroll-sentinel" style="display: flex; justify-content: center; padding: 40px 0; width: 100%;">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 50%; display: inline-block;"></div>
      </div>
    `) : ''}
  `;
};

export const setupGridEvents = (gridContainer, onPinClick, onLikeClick) => {
  if (!gridContainer) return;

  gridContainer.addEventListener('click', (e) => {
    // Check if clicked the like/favorite button
    const likeBtn = e.target.closest('.btn-like');
    if (likeBtn) {
      e.stopPropagation();
      e.preventDefault();
      const pinId = likeBtn.dataset.id;
      if (onLikeClick) {
        onLikeClick(pinId, likeBtn);
      }
      return;
    }

    // Check if clicked a pin card
    const pinCard = e.target.closest('.pin-card');
    if (pinCard) {
      const item = pinCard.closest('.masonry-item');
      if (item) {
        const pinId = item.dataset.id;
        if (onPinClick) {
          onPinClick(pinId);
        }
      }
    }
  });
};

export const setupInfiniteScroll = (sentinelElement, onLoadMore) => {
  if (!sentinelElement || !onLoadMore) return null;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      onLoadMore();
    }
  }, {
    rootMargin: '300px' // Load when sentinel is within 300px of viewport
  });

  observer.observe(sentinelElement);
  return observer;
};
