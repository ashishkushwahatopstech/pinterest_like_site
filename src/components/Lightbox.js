import { makeFilePublic } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';

export const renderLightbox = (img, currentUser, isAdmin) => {
  if (!img) return '';

  const imageUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
  const isOwner = currentUser && currentUser.uid === img.user_id;
  const canDelete = isOwner || isAdmin;

  return `
    <div class="lightbox show" id="lightbox-modal">
      <button class="lightbox-close-btn" id="lightbox-close-btn" aria-label="Close Lightbox">
        <span class="material-icons-outlined" style="font-size: 1.8rem; color: var(--text-primary);">close</span>
      </button>
      
      <div class="lightbox-content-wrapper animate-fade">
        <img class="lightbox-image" src="${imageUrl}" alt="${img.title}">
      </div>
      
      <div class="lightbox-details glass animate-slide-up">
        <div>
          <div class="lightbox-header">
            <div class="lightbox-user">
              <img src="${img.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="Avatar">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem;">${img.users?.display_name || 'Anonymous'}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Uploaded ${new Date(img.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            
            <button class="btn btn-secondary btn-icon btn-like" data-id="${img.id}" style="border-radius: 50%;" aria-label="Like image">
              <span class="material-icons-outlined" style="color: var(--accent-primary);">favorite</span>
            </button>
          </div>
          
          <h2 class="lightbox-title">${img.title}</h2>
          <p class="lightbox-desc">${img.description || 'No description provided.'}</p>
          
          ${img.boards ? `
            <div style="margin-bottom: 24px;">
              <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Board:</span>
              <a href="#board/${img.board_id}" class="btn btn-glass" style="padding: 4px 12px; font-size: 0.8rem; border-radius: var(--radius-sm); margin-left: 8px;">
                <span class="material-icons-outlined" style="font-size: 0.9rem; vertical-align: middle; margin-right: 4px;">folder</span>
                <span style="vertical-align: middle;">${img.boards.name}</span>
              </a>
            </div>
          ` : ''}
          
          ${img.supabase_storage_path ? `
            <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #a3e635;">
              <span class="material-icons-outlined" style="font-size: 1rem;">cloud_done</span>
              <span>Secondary backup copy stored in Supabase</span>
            </div>
          ` : ''}
        </div>
        
        <div class="lightbox-actions">
          <a href="${img.drive_download_link || imageUrl}" target="_blank" download="${img.title}" class="btn btn-primary" style="flex: 1;">
            <span class="material-icons-outlined">download</span>
            <span>Download</span>
          </a>
          
          <button id="lightbox-share-btn" class="btn btn-secondary">
            <span class="material-icons-outlined">share</span>
            <span>Share</span>
          </button>
          
          ${isAdmin ? `
            <button id="lightbox-hide-btn" class="btn btn-danger" style="border-color: #f59e0b; color: #fbbf24; background: rgba(245, 158, 11, 0.1);">
              <span class="material-icons-outlined">visibility_off</span>
              <span>${img.is_public ? 'Hide' : 'Publish'}</span>
            </button>
          ` : ''}
          
          ${canDelete ? `
            <button id="lightbox-delete-btn" class="btn btn-danger" style="padding: 10px;">
              <span class="material-icons-outlined">delete</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

export const setupLightboxEvents = (img, currentUser, isAdmin, callbacks) => {
  const closeBtn = document.getElementById('lightbox-close-btn');
  const lightboxModal = document.getElementById('lightbox-modal');
  const deleteBtn = document.getElementById('lightbox-delete-btn');
  const shareBtn = document.getElementById('lightbox-share-btn');
  const hideBtn = document.getElementById('lightbox-hide-btn');

  const closeLightbox = () => {
    if (lightboxModal) {
      lightboxModal.classList.remove('show');
      
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      
      if (currentSearch.includes('pin=')) {
        const params = new URLSearchParams(currentSearch);
        params.delete('pin');
        const newSearch = params.toString();
        window.appState.navigate(currentPath + (newSearch ? '?' + newSearch : ''), true);
      } else {
        window.appState.navigate(currentPath || '/', true);
      }
    }
    if (callbacks.onClose) callbacks.onClose();
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  // Close lightbox on click outside the image wrapper or detail block (on the backdrop itself)
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        closeLightbox();
      }
    });
  }

  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Like button
  const likeBtn = lightboxModal?.querySelector('.btn-like');
  if (likeBtn && callbacks.onLike) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onLike(img.id, likeBtn);
    });
  }

  // Share button
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      shareBtn.disabled = true;
      shareBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Sharing...</span>`;
      
      try {
        const accessToken = await getGoogleDriveToken();
        if (accessToken) {
          // Set Google Drive file to public reader
          await makeFilePublic(accessToken, img.drive_file_id);
        }
        
        // Copy share link of this platform
        const shareUrl = `${window.location.origin}${window.location.pathname}#home?pin=${img.id}`;
        await navigator.clipboard.writeText(shareUrl);
        
        shareBtn.classList.remove('btn-secondary');
        shareBtn.classList.add('btn-primary');
        shareBtn.style.background = '#22c55e'; // Green success color
        shareBtn.innerHTML = `<span class="material-icons-outlined">check</span><span>Link Copied</span>`;
        
        setTimeout(() => {
          shareBtn.classList.remove('btn-primary');
          shareBtn.style.background = '';
          shareBtn.classList.add('btn-secondary');
          shareBtn.innerHTML = `<span class="material-icons-outlined">share</span><span>Share</span>`;
          shareBtn.disabled = false;
        }, 2000);
      } catch (err) {
        alert("Failed to copy share link: " + err.message);
        shareBtn.disabled = false;
        shareBtn.innerHTML = `<span class="material-icons-outlined">share</span><span>Share</span>`;
      }
    });
  }

  // Delete button
  if (deleteBtn && callbacks.onDelete) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${img.title}"? This will delete the file from Google Drive and the database permanently.`)) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span>`;
        
        try {
          await callbacks.onDelete(img);
          closeLightbox();
        } catch (err) {
          alert("Failed to delete image: " + err.message);
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = `<span class="material-icons-outlined">delete</span>`;
        }
      }
    });
  }

  // Hide/Moderation button
  if (hideBtn && callbacks.onHide) {
    hideBtn.addEventListener('click', async () => {
      const newVisibility = !img.is_public;
      const action = newVisibility ? 'publish' : 'unpublish/hide';
      if (confirm(`Are you sure you want to ${action} this image?`)) {
        hideBtn.disabled = true;
        try {
          await callbacks.onHide(img.id, newVisibility);
          img.is_public = newVisibility;
          hideBtn.innerHTML = `
            <span class="material-icons-outlined">${newVisibility ? 'visibility_off' : 'visibility'}</span>
            <span>${newVisibility ? 'Hide' : 'Publish'}</span>
          `;
        } catch (err) {
          alert("Failed to update visibility: " + err.message);
        } finally {
          hideBtn.disabled = false;
        }
      }
    });
  }
};
