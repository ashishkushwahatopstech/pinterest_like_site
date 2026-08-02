import { makeFilePublic } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';
import { getOptimizedImageUrl } from '../utils/image';
import { requestPremiumFeature } from '../services/premium';
import { extractColorPalette } from '../utils/colorPalette';

export const renderLightbox = (img, currentUser, isAdmin) => {
  if (!img) return '';

  const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
  const imageUrl = getOptimizedImageUrl(rawUrl, 1600);
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
          <div class="lightbox-content-wrapper" style="position: relative; background: rgba(255,255,255,0.02); min-height: 200px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md) 0 0 var(--radius-md); overflow: hidden;">
            <!-- Skeleton loader that displays while loading -->
            <div class="skeleton lightbox-image-skeleton" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;"></div>
            <img class="lightbox-image" src="${imageUrl}" alt="${img.title}" decoding="async" style="opacity: 0; transition: opacity 0.3s ease; z-index: 2;" onload="this.style.opacity='1'; const sk = this.previousElementSibling; if(sk) sk.style.display='none';">
            <button class="btn btn-glass" id="lightbox-fullscreen-exit-btn" style="position: absolute; top: 16px; right: 16px; border-radius: 50%; width: 44px; height: 44px; display: none; align-items: center; justify-content: center; z-index: 500; cursor: pointer; border: 1px solid rgba(255,255,255,0.25); background: rgba(0,0,0,0.5); color: #ffffff;" aria-label="Exit Fullscreen">
              <span class="material-icons-outlined" style="font-size: 1.5rem;">fullscreen_exit</span>
            </button>
          </div>
          
          <div class="lightbox-details animate-slide-up" style="background: var(--bg-secondary); border-radius: 0 var(--radius-lg) var(--radius-lg) 0; border-left: 1px solid var(--border-color); padding: 32px; box-shadow: var(--shadow-md); display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;">
            <div>
              <!-- Static Details Section -->
              <div id="lightbox-static-details">
                <div id="lightbox-title-container" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; width: 100%;">
                  <h2 class="lightbox-title mobile-truncate" id="lightbox-title-display" style="color: var(--text-primary); font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin: 0; word-break: break-word; line-height: 1.3;">${img.title}</h2>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <!-- Like Button (Always visible) -->
                    <button class="btn btn-secondary btn-icon btn-like" data-id="${img.id}" style="border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); cursor: pointer;" aria-label="Like image">
                      <span class="material-icons-outlined" style="color: var(--accent-primary); font-size: 1.2rem;">favorite</span>
                    </button>
                    
                    ${isOwner || isAdmin ? `
                      <button id="lightbox-edit-btn" class="btn btn-glass btn-sm" style="padding: 6px 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; background: var(--bg-primary);">
                        <span class="material-icons-outlined" style="font-size: 0.95rem;">edit</span>
                        <span>Edit</span>
                      </button>
                    ` : ''}
                    <span class="material-icons-outlined" id="title-expand-icon" style="font-size: 1.8rem; display: none; cursor: pointer; user-select: none;">expand_more</span>
                  </div>
                </div>
                
                <!-- Collapsible drawer on mobile -->
                <div id="lightbox-collapsible-drawer">
                  <!-- User Profile Details Card (Inside the toggle) -->
                  <div class="lightbox-user" style="display: flex; align-items: center; gap: 12px; margin-top: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                    <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: var(--bg-tertiary); flex-shrink: 0; border: 1px solid var(--border-color);">
                      <div class="skeleton" style="position: absolute; inset: 0; z-index: 1;"></div>
                      <img src="${img.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease; position: relative; z-index: 2;" onload="this.style.opacity='1'; const sk=this.previousElementSibling; if(sk) sk.style.display='none';" onerror="const sk=this.previousElementSibling; if(sk) sk.style.display='none';">
                    </div>
                    <div>
                      <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${img.users?.display_name || 'Anonymous'}</div>
                      <div style="font-size: 0.75rem; color: var(--text-secondary);">Uploaded ${new Date(img.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <p class="lightbox-desc" id="lightbox-desc-display" style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; font-size: 0.9rem; word-break: break-word;">${img.description || 'No description provided.'}</p>
                  
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

                  <!-- AI Color Palette Output Container (PRO Feature) -->
                  <div id="lightbox-palette-display" style="display: none; margin-bottom: 24px; padding: 14px; border-radius: var(--radius-md); background: var(--bg-primary); border: 1px solid rgba(255, 215, 0, 0.3); animation: fadeIn 0.3s ease;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                        <span class="material-icons-outlined" style="color: #ffd700; font-size: 1.1rem;">auto_awesome</span>
                        <span>AI Color Palette</span>
                      </div>
                      <span style="font-size: 0.7rem; color: var(--text-secondary);">Click color to copy HEX</span>
                    </div>
                    <div id="palette-swatches-wrapper" style="display: flex; gap: 8px; width: 100%;">
                      <!-- Dynamically populated hex swatches -->
                    </div>
                  </div>
                </div>

                <div class="lightbox-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                  <!-- Standard HD Download -->
                  <button id="lightbox-download-btn" data-href="${img.drive_download_link || imageUrl}" data-title="${img.title}" class="btn btn-secondary" style="flex: 1; min-width: 110px; gap: 6px; align-items: center; justify-content: center; display: flex; padding: 12px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">
                    <span class="material-icons-outlined">download</span>
                    <span>HD Download</span>
                  </button>
                  
                  <!-- Ultra HD 4K Original Download (PRO) -->
                  <button id="lightbox-pro-download-btn" data-href="${img.drive_download_link || rawUrl}" data-title="${img.title}" class="btn btn-primary" style="flex: 1.2; min-width: 140px; gap: 6px; align-items: center; justify-content: center; display: flex; padding: 12px; border-radius: var(--radius-md); font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); color: #000; box-shadow: 0 4px 14px rgba(255, 215, 0, 0.35);">
                    <span class="material-icons-outlined" style="font-size: 1.1rem;">workspace_premium</span>
                    <span>4K Ultra HD</span>
                  </button>

                  <!-- AI Color Palette Button (PRO) -->
                  <button id="lightbox-palette-btn" class="btn btn-glass" style="padding: 12px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(255,215,0,0.4);" title="Extract Color Palette">
                    <span class="material-icons-outlined" style="color: #ffd700; font-size: 1.2rem;">palette</span>
                    <span style="font-size: 0.85rem;">Colors</span>
                  </button>

                  <button id="lightbox-share-btn" class="btn btn-secondary" style="padding: 12px 14px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;">
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

  // Mobile collapsible elements
  const titleContainer = document.getElementById('lightbox-title-container');
  const collapsibleDrawer = document.getElementById('lightbox-collapsible-drawer');
  const expandIcon = document.getElementById('title-expand-icon');

  const closeLightbox = () => {
    // Exit native fullscreen if active
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }

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

  // Toggle fullscreen mode (combining Native elements request + layout fallback classes)
  if (infoToggleBtn && lightboxModal) {
    const contentWrapper = document.querySelector('.lightbox-content-wrapper');

    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      const icon = document.getElementById('info-toggle-icon');
      if (icon) {
        icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
      }
      if (isFullscreen) {
        lightboxModal.classList.add('hide-info');
      } else {
        lightboxModal.classList.remove('hide-info');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    infoToggleBtn.addEventListener('click', () => {
      if (contentWrapper) {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          // Enter fullscreen
          if (contentWrapper.requestFullscreen) {
            contentWrapper.requestFullscreen();
          } else if (contentWrapper.webkitRequestFullscreen) {
            contentWrapper.webkitRequestFullscreen();
          } else {
            // Fallback for browsers that do not support element fullscreen
            lightboxModal.classList.toggle('hide-info');
            const isHidden = lightboxModal.classList.contains('hide-info');
            const icon = document.getElementById('info-toggle-icon');
            if (icon) {
              icon.textContent = isHidden ? 'fullscreen_exit' : 'fullscreen';
            }
          }
        } else {
          // Exit fullscreen
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        }
      }
    });

    const exitOverlayBtn = document.getElementById('lightbox-fullscreen-exit-btn');
    if (exitOverlayBtn) {
      exitOverlayBtn.onclick = (e) => {
        e.stopPropagation();
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      };
    }
  }

  // Mobile collapsible title triggers
  if (titleContainer && collapsibleDrawer) {
    titleContainer.onclick = (e) => {
      // Don't expand if click was on the like button or edit button
      if (e.target.closest('.btn-like') || e.target.closest('#lightbox-edit-btn')) {
        return;
      }

      // Toggle expanded drawer
      const isExpanded = collapsibleDrawer.classList.toggle('expanded');
      
      // Update toggle icon
      if (expandIcon) {
        expandIcon.textContent = isExpanded ? 'expand_less' : 'expand_more';
      }
      
      // Toggle single-line text truncation
      const titleDisplay = document.getElementById('lightbox-title-display');
      if (titleDisplay) {
        if (isExpanded) {
          titleDisplay.classList.remove('mobile-truncate');
        } else {
          titleDisplay.classList.add('mobile-truncate');
        }
      }
    };
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

  // PRO Feature 1: Ultra HD 4K Original Download
  const proDownloadBtn = document.getElementById('lightbox-pro-download-btn');
  if (proDownloadBtn) {
    proDownloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      requestPremiumFeature('Ultra HD 4K Original Download', async () => {
        const originalText = proDownloadBtn.innerHTML;
        proDownloadBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Fetching 4K...</span>`;
        proDownloadBtn.style.pointerEvents = 'none';

        try {
          const fileUrl = proDownloadBtn.dataset.href;
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error("Fetch failed");

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          const tempLink = document.createElement('a');
          tempLink.href = blobUrl;
          const fileExt = fileUrl.split('?')[0].split('.').pop() || 'png';
          const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fileExt.toLowerCase()) ? fileExt : 'png';
          tempLink.download = `${proDownloadBtn.dataset.title || 'image'}_4K_UltraHD.${safeExt}`;

          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
          URL.revokeObjectURL(blobUrl);
        } catch (err) {
          window.open(proDownloadBtn.dataset.href, '_blank');
        } finally {
          proDownloadBtn.innerHTML = originalText;
          proDownloadBtn.style.pointerEvents = 'auto';
        }
      });
    });
  }

  // PRO Feature 2: AI Color Palette Extractor
  const paletteBtn = document.getElementById('lightbox-palette-btn');
  const paletteDisplay = document.getElementById('lightbox-palette-display');
  const swatchesWrapper = document.getElementById('palette-swatches-wrapper');

  if (paletteBtn && paletteDisplay && swatchesWrapper) {
    paletteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      requestPremiumFeature('AI Color Palette Generator', async () => {
        paletteBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite; color: #ffd700;">hourglass_empty</span>`;
        
        const imgEl = document.querySelector('.lightbox-image');
        const sampleUrl = imgEl ? imgEl.src : (img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`);
        
        const hexColors = await extractColorPalette(sampleUrl);

        swatchesWrapper.innerHTML = hexColors.map(hex => `
          <div class="palette-chip" data-color="${hex}" style="flex: 1; height: 36px; border-radius: var(--radius-sm); background: ${hex}; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid rgba(255,255,255,0.2); transition: transform 0.2s;" title="Click to copy ${hex}">
            <span class="chip-hex-label" style="font-size: 0.65rem; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${hex}</span>
          </div>
        `).join('');

        paletteDisplay.style.display = 'block';
        paletteBtn.innerHTML = `<span class="material-icons-outlined" style="color: #ffd700; font-size: 1.2rem;">palette</span><span style="font-size: 0.85rem;">Colors</span>`;

        // Copy HEX code on chip click
        swatchesWrapper.querySelectorAll('.palette-chip').forEach(chip => {
          chip.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const color = chip.dataset.color;
            navigator.clipboard.writeText(color);
            const label = chip.querySelector('.chip-hex-label');
            if (label) {
              const oldText = label.textContent;
              label.textContent = 'COPIED!';
              setTimeout(() => { label.textContent = oldText; }, 1200);
            }
          });
        });
      });
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

  // Share button with native sharing API support
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      shareBtn.disabled = true;
      shareBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Sharing...</span>`;
      
      try {
        const isOwner = currentUser && currentUser.uid === img.user_id;
        if (isOwner) {
          try {
            const accessToken = await getGoogleDriveToken();
            if (accessToken) {
              await makeFilePublic(accessToken, img.drive_file_id);
            }
          } catch (driveErr) {
            console.warn("Owner failed to ensure file is public on Google Drive:", driveErr);
          }
        }
        
        const cleanTitle = window.appState.slugify(img.title);
        const shareUrl = `${window.location.origin}/pin/${cleanTitle}--${img.id}`;
        
        // Use native mobile share sheet API if available
        if (navigator.share) {
          try {
            await navigator.share({
              title: img.title,
              text: img.description || `Check out ${img.title} on PinGrid!`,
              url: shareUrl
            });
            
            shareBtn.classList.remove('btn-secondary');
            shareBtn.classList.add('btn-primary');
            shareBtn.style.background = '#22c55e';
            shareBtn.innerHTML = `<span class="material-icons-outlined">check</span><span>Shared</span>`;
            
            setTimeout(() => {
              shareBtn.classList.remove('btn-primary');
              shareBtn.style.background = '';
              shareBtn.classList.add('btn-secondary');
              shareBtn.innerHTML = `<span class="material-icons-outlined">share</span><span>Share</span>`;
              shareBtn.disabled = false;
            }, 2000);
            return;
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') {
              shareBtn.disabled = false;
              shareBtn.innerHTML = `<span class="material-icons-outlined">share</span><span>Share</span>`;
              return;
            }
            console.warn("navigator.share failed, running clipboard fallback:", shareErr);
          }
        }

        // Robust clipboard write fallback
        let copySuccess = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(shareUrl);
            copySuccess = true;
          } catch (clipErr) {
            console.warn("navigator.clipboard failed, running selection fallback:", clipErr);
          }
        }
        
        if (!copySuccess) {
          const textarea = document.createElement('textarea');
          textarea.value = shareUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          try {
            document.execCommand('copy');
            copySuccess = true;
          } catch (execErr) {
            console.error("Selection copy fallback failed:", execErr);
          }
          document.body.removeChild(textarea);
        }
        
        if (!copySuccess) {
          throw new Error("Could not copy link to clipboard. Please copy it manually: " + shareUrl);
        }
        
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
        alert(err.message);
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
