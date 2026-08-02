import { getOptimizedImageUrl } from '../utils/image';

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
    // Generate optimized CDN thumbnail source from Google Drive or cloud storage
    const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
    const imageUrl = getOptimizedImageUrl(rawUrl, 600);
    
    return `
      <div class="masonry-item animate-fade" data-id="${img.id}">
        <div class="pin-card">
          <div class="pin-image-wrapper">
            <img src="${imageUrl}" alt="${img.title}" loading="lazy" decoding="async">
          </div>
          <div class="pin-overlay">
            <div class="pin-top-actions">
              ${img.boards ? `
                <span class="pin-board-badge">${img.boards.name}</span>
              ` : '<span></span>'}
              <button class="pin-save-btn btn-like" data-id="${img.id}" aria-label="Like image">
                <span class="material-icons-outlined" style="font-size: 1rem; vertical-align: middle;">favorite</span>
                <span class="likes-count-label" style="vertical-align: middle; margin-left: 2px;">${img.likes_count}</span>
              </button>
            </div>
            <div class="pin-bottom-info">
              <h4 class="pin-title">${img.title}</h4>
              <div class="pin-author">
                <img src="${img.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="pin-author-img" alt="Avatar">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">
                  ${img.users?.display_name || 'Anonymous'}
                </span>
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
