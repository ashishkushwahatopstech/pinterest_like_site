import { makeFilePublic } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';

export const renderLightbox = (img, currentUser, isAdmin) => {
  if (!img) return '';

  const imageUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
  const isOwner = currentUser && currentUser.uid === img.user_id;
  const canDelete = isOwner || isAdmin;
  
  // Restore user preference for info panel
  const isInfoHidden = localStorage.getItem('lightbox_info_hidden') === 'true';

  return `
    <div class="lightbox show ${isInfoHidden ? 'hide-info' : ''}" id="lightbox-modal">
      <!-- Fixed Controls Toolbar -->
      <button class="lightbox-close-btn" id="lightbox-close-btn" aria-label="Close Lightbox" style="position: fixed; z-index: 310;">
        <span class="material-icons-outlined" style="font-size: 1.8rem; color: var(--text-primary);">close</span>
      </button>
      
      <button class="lightbox-close-btn" id="lightbox-info-toggle-btn" style="right: 88px; position: fixed; z-index: 310;" aria-label="Toggle Fullscreen">
        <span class="material-icons-outlined" id="info-toggle-icon" style="font-size: 1.8rem; color: var(--text-primary);">${isInfoHidden ? 'fullscreen_exit' : 'fullscreen'}</span>
      </button>
      
      <!-- Scrollable Container -->
      <div class="lightbox-scroll-container">
        
        <!-- Main Detail Card -->
        <div class="lightbox-main-card glass animate-fade">
          <div class="lightbox-content-wrapper">
            <img class="lightbox-image" src="${imageUrl}" alt="${img.title}">
          </div>
          
          <div class="lightbox-details animate-slide-up" style="background: var(--bg-secondary); border-radius: 0 var(--radius-lg) var(--radius-lg) 0; border-left: 1px solid var(--border-color); padding: 32px; box-shadow: var(--shadow-md); display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;">
            <div>
              <div class="lightbox-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                <div class="lightbox-user" style="display: flex; align-items: center; gap: 12px;">
                  <img src="${img.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${img.users?.display_name || 'Anonymous'}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Uploaded ${new Date(img.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <button class="btn btn-secondary btn-icon btn-like" data-id="${img.id}" style="border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;" aria-label="Like image">
                  <span class="material-icons-outlined" style="color: var(--accent-primary);">favorite</span>
                </button>
              </div>

              <!-- Static Details Section -->
              <div id="lightbox-static-details">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
                  <h2 class="lightbox-title" id="lightbox-title-display" style="color: var(--text-primary); font-family: var(--font-heading); font-size: 1.6rem; font-weight: 700; margin: 0; word-break: break-word; line-height: 1.3;">${img.title}</h2>
                  ${isOwner || isAdmin ? `
                    <button id="lightbox-edit-btn" class="btn btn-glass btn-sm" style="padding: 6px 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; background: var(--bg-primary);">
                      <span class="material-icons-outlined" style="font-size: 0.95rem;">edit</span>
                      <span>Edit</span>
                    </button>
                  ` : ''}
                </div>
                
                <p class="lightbox-desc" id="lightbox-desc-display" style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; font-size: 0.9rem; word-break: break-word;">${img.description || 'No description provided.'}</p>
              </div>

              <!-- Edit Inline Form (Hidden initially) -->
              <div id="lightbox-edit-form" style="display: none; flex-direction: column; gap: 16px; margin-bottom: 24px; padding: 16px; border-radius: var(--radius-md); background: var(--bg-primary); border: 1px solid var(--border-color);">
                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                  <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: var(--text-secondary);">Title</label>
                  <input type="text" id="edit-img-title" class="form-control" value="${img.title}" required style="font-weight: 600; width: 100%; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary);">
                </div>
                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                  <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: var(--text-secondary);">Description</label>
                  <textarea id="edit-img-desc" class="form-control" rows="3" style="resize: vertical; width: 100%; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: var(--font-body);">${img.description || ''}</textarea>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button id="edit-save-btn" class="btn btn-primary" style="flex: 1; padding: 10px; font-size: 0.85rem; font-weight: 600; border-radius: var(--radius-sm); cursor: pointer;">Save Changes</button>
                  <button id="edit-cancel-btn" class="btn btn-secondary" style="padding: 10px 16px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer;">Cancel</button>
                </div>
              </div>
              
              ${img.boards ? `
                <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Board:</span>
                  <a href="/board/${img.boards.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()}--${img.board_id}" class="btn btn-glass" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm); color: var(--text-primary); display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border-color);">
                    <span class="material-icons-outlined" style="font-size: 0.95rem;">folder</span>
                    <span>${img.boards.name}</span>
                  </a>
                </div>
              ` : ''}
              
              ${img.supabase_storage_path ? `
                <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #a3e635; background: rgba(163,230,53,0.1); padding: 8px 12px; border-radius: var(--radius-sm); width: fit-content;">
                  <span class="material-icons-outlined" style="font-size: 1.1rem;">cloud_done</span>
                  <span style="font-weight: 500;">Secondary backup copy stored in Supabase</span>
                </div>
              ` : ''}
            </div>
            
            <div class="lightbox-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 20px;">
              <button id="lightbox-download-btn" data-href="${img.drive_download_link || imageUrl}" data-title="${img.title}" class="btn btn-primary" style="flex: 1; min-width: 120px; gap: 8px; align-items: center; justify-content: center; display: flex; padding: 12px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">
                <span class="material-icons-outlined">download</span>
                <span>Download</span>
              </button>
              
              <button id="lightbox-share-btn" class="btn btn-secondary" style="padding: 12px 16px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">
                <span class="material-icons-outlined">share</span>
                <span>Share</span>
              </button>
              
              ${isAdmin ? `
                <button id="lightbox-hide-btn" class="btn btn-danger" style="border-color: #f59e0b; color: #fbbf24; background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">
                  <span class="material-icons-outlined">visibility_off</span>
                  <span>${img.is_public ? 'Hide' : 'Publish'}</span>
                </button>
              ` : ''}
              
              ${canDelete ? `
                <button id="lightbox-delete-btn" class="btn btn-danger" style="padding: 12px; border-radius: var(--radius-md); cursor: pointer;" aria-label="Delete Image">
                  <span class="material-icons-outlined">delete</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Related Images Section -->
        <div class="lightbox-related-section animate-fade" id="lightbox-related-section" style="margin-top: 40px; display: none;">
          <h3 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700; color: #ffffff; margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-outlined" style="color: var(--accent-primary); font-size: 1.6rem;">auto_awesome</span>
            <span>More Like This</span>
          </h3>
          <div id="lightbox-related-grid-container" class="masonry-container" style="padding: 0;">
            <!-- Populated asynchronously in main.js -->
          </div>
        </div>

      </div>
    </div>
  `;
};

export const setupLightboxEvents = (img, currentUser, isAdmin, callbacks) => {
  const closeBtn = document.getElementById('lightbox-close-btn');
  const infoToggleBtn = document.getElementById('lightbox-info-toggle-btn');
  const downloadBtn = document.getElementById('lightbox-download-btn');
  const lightboxModal = document.getElementById('lightbox-modal');
  const deleteBtn = document.getElementById('lightbox-delete-btn');
  const shareBtn = document.getElementById('lightbox-share-btn');
  const hideBtn = document.getElementById('lightbox-hide-btn');

  // Inline edit bindings
  const editBtn = document.getElementById('lightbox-edit-btn');
  const editForm = document.getElementById('lightbox-edit-form');
  const staticDetails = document.getElementById('lightbox-static-details');
  const saveChangesBtn = document.getElementById('edit-save-btn');
  const cancelChangesBtn = document.getElementById('edit-cancel-btn');

  const closeLightbox = () => {
    if (lightboxModal) {
      lightboxModal.classList.remove('show');
      
      const referrer = sessionStorage.getItem('lightbox_referrer');
      sessionStorage.removeItem('lightbox_referrer');
      if (referrer && referrer !== window.location.pathname) {
        window.appState.navigate(referrer, true);
      } else {
        window.appState.navigate('/', true);
      }
    }
    if (callbacks.onClose) callbacks.onClose();
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  // Toggle info panel visibility
  if (infoToggleBtn && lightboxModal) {
    infoToggleBtn.addEventListener('click', () => {
      lightboxModal.classList.toggle('hide-info');
      const isHidden = lightboxModal.classList.contains('hide-info');
      localStorage.setItem('lightbox_info_hidden', isHidden ? 'true' : 'false');
      
      const icon = document.getElementById('info-toggle-icon');
      if (icon) {
        icon.textContent = isHidden ? 'fullscreen_exit' : 'fullscreen';
      }
    });
  }

  // Inline edit triggers
  if (editBtn && editForm && staticDetails) {
    editBtn.onclick = (e) => {
      e.stopPropagation();
      editForm.style.display = 'flex';
      staticDetails.style.display = 'none';
      editBtn.style.display = 'none';
    };
  }

  if (cancelChangesBtn && editForm && staticDetails) {
    cancelChangesBtn.onclick = (e) => {
      e.stopPropagation();
      editForm.style.display = 'none';
      staticDetails.style.display = 'block';
      if (editBtn) editBtn.style.display = 'flex';
    };
  }

  if (saveChangesBtn && callbacks.onSave) {
    saveChangesBtn.onclick = async (e) => {
      e.stopPropagation();
      const newTitle = document.getElementById('edit-img-title').value.trim();
      const newDesc = document.getElementById('edit-img-desc').value.trim();
      
      if (!newTitle) {
        alert("Title cannot be empty!");
        return;
      }

      saveChangesBtn.disabled = true;
      saveChangesBtn.textContent = 'Saving...';

      try {
        await callbacks.onSave(img.id, newTitle, newDesc);
        
        // Update local object values
        img.title = newTitle;
        img.description = newDesc;

        // Update UI Display elements
        const titleDisplay = document.getElementById('lightbox-title-display');
        const descDisplay = document.getElementById('lightbox-desc-display');
        if (titleDisplay) titleDisplay.textContent = newTitle;
        if (descDisplay) descDisplay.textContent = newDesc;

        // Close form
        editForm.style.display = 'none';
        staticDetails.style.display = 'block';
        if (editBtn) editBtn.style.display = 'flex';
        
        // Update download button data-title
        if (downloadBtn) downloadBtn.dataset.title = newTitle;
      } catch (err) {
        alert("Failed to save changes: " + err.message);
      } finally {
        saveChangesBtn.disabled = false;
        saveChangesBtn.textContent = 'Save Changes';
      }
    };
  }

  // Force file download locally (bypassing cross-origin browser new tab navigations)
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const originalText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Downloading...</span>`;
      downloadBtn.style.pointerEvents = 'none';

      try {
        const fileUrl = downloadBtn.dataset.href;
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Fetch failed");
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        
        const fileExt = fileUrl.split('?')[0].split('.').pop() || 'png';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fileExt.toLowerCase()) ? fileExt : 'png';
        tempLink.download = `${downloadBtn.dataset.title || 'image'}.${safeExt}`;
        
        document.body.appendChild(tempLink);
        tempLink.click();
        
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.warn("Direct download failed, falling back to new tab:", err);
        window.open(downloadBtn.dataset.href, '_blank');
      } finally {
        downloadBtn.innerHTML = originalText;
        downloadBtn.style.pointerEvents = 'auto';
      }
    });
  }

  // Close lightbox on click outside the image wrapper or detail block (on the backdrop itself)
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      const scrollContainer = document.querySelector('.lightbox-scroll-container');
      if (e.target === lightboxModal || e.target === scrollContainer) {
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
          await makeFilePublic(accessToken, img.drive_file_id);
        }
        
        const cleanTitle = window.appState.slugify(img.title);
        const shareUrl = `${window.location.origin}/pin/${cleanTitle}--${img.id}`;
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
