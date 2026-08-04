import { getSupabase, supabasePublic } from '../services/supabase';
import { renderMasonryGrid, setupGridEvents } from '../components/MasonryGrid';
import { renderPinSkeleton } from '../components/Skeleton';
import { renameBoardFolder, deleteFromDrive } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';
import { getOptimizedImageUrl } from '../utils/image';
import { requestPremiumFeature } from '../services/premium';
import { canUserAccessRecord, isLinkAccessAllowed, formatDescriptionWithPrivacy } from '../utils/privacy';

export const BoardView = {
  containerId: 'view-container',
  board: null,
  images: [],
  isOwner: false,
  loading: true,

  render: async function(params = {}) {
    const boardId = params.id;
    if (!boardId) {
      window.appState.navigate('/');
      return;
    }

    this.board = null;
    this.images = [];
    this.isOwner = false;
    this.loading = true;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Loading layout
    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px;">
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
          <div class="skeleton" style="width: 250px; height: 36px;"></div>
          <div class="skeleton" style="width: 150px; height: 16px;"></div>
        </div>
        <div class="masonry-container">
          ${renderPinSkeleton(5)}
        </div>
      </div>
    `;

    await this.fetchBoardDetails(boardId);

    if (!this.board) {
      container.innerHTML = `
        <div class="container text-center" style="padding: 80px 24px; text-align: center;">
          <span class="material-icons-outlined" style="font-size: 4rem; color: #ef4444; margin-bottom: 16px;">lock</span>
          <h2 style="font-size: 1.5rem; margin-bottom: 8px;">Collection is Private or Unauthorized</h2>
          <p style="color: var(--text-secondary); max-width: 460px; margin: 0 auto 24px auto;">This collection is private and accessible only by its creator.</p>
          <a href="/" class="btn btn-primary">Go to Home Gallery</a>
        </div>
      `;
      return;
    }

    if (window.appState.updateSEO && this.board) {
      window.appState.updateSEO(`Collection: ${this.board.name}`, `Browse the ${this.board.name} board backups, shared pins, and beautiful galleries on the PinGrid network.`);
    }

    await this.fetchBoardImages(this.board.id);
    this.renderContent();
  },

  fetchBoardDetails: async function(boardId) {
    try {
      const user = window.appState?.currentUser;
      const isAdmin = window.appState?.isAdmin;
      const supabase = user ? await getSupabase() : supabasePublic;
      
      let boardQuery = supabase.from('boards').select('*, users(*)');
      if (boardId.length === 36) {
        boardQuery = boardQuery.eq('id', boardId);
      } else {
        const rawMin = boardId.padEnd(8, '0');
        const minUuid = rawMin.slice(0,8) + '-0000-0000-0000-000000000000';
        const rawMax = boardId.padEnd(8, 'f');
        const maxUuid = rawMax.slice(0,8) + '-ffff-ffff-ffff-ffffffffffff';
        boardQuery = boardQuery.gte('id', minUuid).lte('id', maxUuid);
      }
      const { data, error } = await boardQuery;
      if (error || !data || data.length === 0) {
        this.board = null;
        return;
      }

      const boardObj = data[0];

      // Enforce Privacy & Access Permission
      if (!canUserAccessRecord(boardObj, user, isAdmin)) {
        this.board = null;
        return;
      }

      this.board = boardObj;
      this.isOwner = user && user.uid === this.board.user_id;
    } catch (err) {
      console.error("Error fetching board details:", err);
    }
  },

  fetchBoardImages: async function(boardId) {
    try {
      const user = window.appState?.currentUser;
      const isAdmin = window.appState?.isAdmin;
      const supabase = user ? await getSupabase() : supabasePublic;

      const { data, error } = await supabase
        .from('images')
        .select('*, users!images_user_id_fkey(*), boards(*)')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter images based on access permissions
      const allImages = data || [];
      this.images = allImages.filter(img => canUserAccessRecord(img, user, isAdmin));
    } catch (err) {
      console.error("Error fetching board images:", err);
    } finally {
      this.loading = false;
    }
  },

  renderContent: function() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const boardName = this.board.name;
    const isPublic = this.board.is_public;
    const authorName = this.board.users?.display_name || 'Anonymous';

    // Select dynamic cover image from first board image or fallback
    const rawCover = this.images.length > 0
      ? (this.images[0].drive_view_link || `https://lh3.googleusercontent.com/d/${this.images[0].drive_file_id}`)
      : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';
    const coverUrl = getOptimizedImageUrl(rawCover, 800);

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 24px;">
        <!-- Dynamic Board Cover Banner -->
        <div class="board-cover" style="height: 200px; border-radius: var(--radius-lg); overflow: hidden; position: relative; margin-bottom: -50px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <img src="${coverUrl}" style="width: 100%; height: 100%; object-fit: cover; filter: blur(2px) brightness(0.75);" alt="Board Cover" loading="lazy" decoding="async">
          <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(15,23,42,0.4));"></div>
        </div>

        <!-- Board Header -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px; position: relative; z-index: 10; padding-left: 20px; padding-right: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
            <div style="background: var(--bg-secondary); padding: 16px 24px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-md);">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <h1 style="font-size: 2.2rem; font-family: var(--font-heading); color: var(--text-primary); margin: 0;">${boardName}</h1>
                <span class="btn-glass" style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 4px; border: 1px solid var(--border-color); color: var(--text-primary);">
                  <span class="material-icons-outlined" style="font-size: 0.9rem;">${isPublic ? 'public' : 'lock'}</span>
                  <span>${isPublic ? 'Public' : 'Private'}</span>
                </span>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 6px;">Created by ${authorName}</p>
            </div>
            
            <div style="margin-bottom: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <!-- Slideshow Button -->
              <button id="board-slideshow-btn" class="btn btn-glass btn-icon" title="Play Slideshow" style="background: var(--bg-secondary); border: 1px solid var(--border-color); width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer;">
                <span class="material-icons-outlined" style="font-size: 1.5rem; color: var(--accent-primary);">slideshow</span>
              </button>

              <!-- PRO Batch Download Button -->
              <button id="board-batch-download-btn" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); color: #000; font-weight: 700; border: none; box-shadow: 0 4px 14px rgba(255, 215, 0, 0.35); cursor: pointer;" title="Batch Download Collection">
                <span class="material-icons-outlined" style="font-size: 1.1rem;">workspace_premium</span>
                <span>Batch Download (PRO)</span>
              </button>

              ${this.isOwner ? `
                <button id="board-upload-btn" class="btn btn-primary" style="display: flex; align-items: center; gap: 4px;">
                  <span class="material-icons-outlined">add</span>
                  <span>Upload</span>
                </button>
                <button id="board-settings-btn" class="btn btn-secondary btn-icon" title="Board Settings">
                  <span class="material-icons-outlined">settings</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Board Options Panel (Hidden by default, toggled by settings button) -->
        ${this.isOwner ? `
          <div id="board-options-panel" class="glass" style="display: none; padding: 24px; border-radius: var(--radius-md); margin-bottom: 32px; animation: slideUp 0.2s ease;">
            <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Manage Board: ${boardName}</h3>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
                  <input type="text" id="rename-board-input" class="form-control" value="${boardName}" placeholder="New board name">
                </div>
                <button id="rename-board-btn" class="btn btn-secondary">Rename</button>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div>
                  <div style="font-weight: 600; font-size: 0.95rem;">Public Gallery Visibility</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">Public boards show up on the Home explore feed and search.</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="board-toggle-public" ${isPublic ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>

              <div id="link-access-container" style="display: ${isPublic ? 'none' : 'flex'}; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div>
                  <div style="font-weight: 600; font-size: 0.95rem;">Allow Direct Link Access (Unlisted)</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">When ON, anyone with the direct URL link can view. When OFF, ONLY you (creator) can view.</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="board-toggle-link-access" ${isLinkAccessAllowed(this.board) ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div>
                  <div style="font-weight: 600; font-size: 0.95rem; color: #f87171;">Danger Zone</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">Deleting this board also deletes all images within it.</div>
                </div>
                <button id="delete-board-btn" class="btn btn-danger">Delete Board</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Masonry Grid -->
        <div id="board-grid-container" class="masonry-container">
          ${renderMasonryGrid(this.images, false)}
        </div>
      </div>
    `;

    this.setupEvents();
  },

  setupEvents: function() {
    // Handle grid clicks (like/detail)
    const gridEl = document.getElementById('gallery-masonry-grid');
    if (gridEl) {
      setupGridEvents(
        gridEl,
        (pinId) => {
          const imgObj = this.images.find(img => img.id === pinId);
          sessionStorage.setItem('lightbox_referrer', window.location.pathname + window.location.search);
          window.appState.navigate(window.appState.getPinUrl(imgObj || pinId));
        },
        async (pinId, likeBtn) => {
          if (window.appState && window.appState.toggleLike) {
            await window.appState.toggleLike(pinId, likeBtn);
          }
        }
      );
    }

    // Batch Download Collection (PRO)
    const batchBtn = document.getElementById('board-batch-download-btn');
    if (batchBtn) {
      batchBtn.onclick = () => {
        if (!this.images || this.images.length === 0) {
          alert("No images in this collection to download!");
          return;
        }

        requestPremiumFeature('Batch Collection Downloader', async () => {
          const originalText = batchBtn.innerHTML;
          batchBtn.style.pointerEvents = 'none';

          for (let i = 0; i < this.images.length; i++) {
            const img = this.images[i];
            batchBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Downloading (${i + 1}/${this.images.length})...</span>`;
            
            try {
              const fileUrl = img.drive_download_link || img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
              const response = await fetch(fileUrl);
              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const tempLink = document.createElement('a');
                tempLink.href = blobUrl;
                const fileExt = fileUrl.split('?')[0].split('.').pop() || 'png';
                const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(fileExt.toLowerCase()) ? fileExt : 'png';
                tempLink.download = `${img.title || 'image'}_${i + 1}.${safeExt}`;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
                URL.revokeObjectURL(blobUrl);
              }
            } catch (err) {
              console.warn("Batch download failed for item:", img.title);
            }
            
            // Brief pause between downloads
            await new Promise(r => setTimeout(r, 400));
          }

          batchBtn.innerHTML = originalText;
          batchBtn.style.pointerEvents = 'auto';
          alert(`Successfully downloaded ${this.images.length} images from "${this.board.name}"!`);
        });
      };
    }

    // Slideshow click handler
    const slideshowBtn = document.getElementById('board-slideshow-btn');
    if (slideshowBtn) {
      slideshowBtn.onclick = () => {
        if (this.images.length === 0) {
          alert("This board has no images to display in a slideshow!");
          return;
        }

        // Slideshow overlay HTML
        const overlay = document.createElement('div');
        overlay.innerHTML = `
          <div id="slideshow-overlay" style="position: fixed; inset: 0; background: #000000; z-index: 500; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; color: #ffffff; animation: fadeIn 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; z-index: 10;">
              <div>
                <h2 style="font-family: var(--font-heading); font-size: 1.3rem; margin: 0; color: #fff;">${this.board.name} Slideshow</h2>
                <div id="slideshow-counter" style="font-size: 0.8rem; color: #a1a1aa; margin-top: 4px;">Image 1 of ${this.images.length}</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="slideshow-play-pause" class="btn btn-glass" style="border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: var(--radius-sm); cursor: pointer; background: rgba(255,255,255,0.1); display: flex; align-items: center; gap: 6px;">
                  <span class="material-icons-outlined" style="font-size: 1.2rem;">pause</span>
                  <span id="play-pause-text">Pause</span>
                </button>
                <button id="slideshow-close" class="btn btn-glass" style="border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.1);">
                  <span class="material-icons-outlined">close</span>
                </button>
              </div>
            </div>

            <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 40px 0;">
              <button id="slideshow-prev" style="position: absolute; left: 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; z-index: 10;">
                <span class="material-icons-outlined" style="font-size: 1.8rem;">chevron_left</span>
              </button>

              <div id="slideshow-image-container" style="max-width: 90%; max-height: 85vh; display: flex; flex-direction: column; align-items: center; transition: opacity 0.3s ease; opacity: 1;">
                <img id="slideshow-img-el" src="" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: var(--radius-md); box-shadow: 0 20px 50px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1);">
                <h3 id="slideshow-img-title" style="margin-top: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.8); text-align: center; max-width: 600px; font-size: 1.2rem; color: #fff;">Image Title</h3>
              </div>

              <button id="slideshow-next" style="position: absolute; right: 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; z-index: 10;">
                <span class="material-icons-outlined" style="font-size: 1.8rem;">chevron_right</span>
              </button>
            </div>

            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; overflow: hidden; z-index: 10;">
              <div id="slideshow-progress" style="height: 100%; width: 0%; background: linear-gradient(135deg, #ff3366 0%, #ff6633 100%); transition: width 0.1s linear;"></div>
            </div>
          </div>
        `;
        document.body.appendChild(overlay.firstElementChild);

        const overlayEl = document.getElementById('slideshow-overlay');
        const imgEl = document.getElementById('slideshow-img-el');
        const titleEl = document.getElementById('slideshow-img-title');
        const counterEl = document.getElementById('slideshow-counter');
        const progressEl = document.getElementById('slideshow-progress');
        const playPauseBtn = document.getElementById('slideshow-play-pause');
        const playPauseIcon = playPauseBtn.querySelector('.material-icons-outlined');
        const playPauseText = document.getElementById('play-pause-text');
        
        let currentIndex = 0;
        let isPlaying = true;
        let slideInterval;
        let progressInterval;
        let progressPercent = 0;
        const SLIDE_DURATION = 4000;

        const updateSlide = () => {
          const img = this.images[currentIndex];
          const url = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
          
          const container = document.getElementById('slideshow-image-container');
          if (container) container.style.opacity = '0';
          
          setTimeout(() => {
            imgEl.src = url;
            titleEl.textContent = img.title;
            counterEl.textContent = `Image ${currentIndex + 1} of ${this.images.length}`;
            if (container) container.style.opacity = '1';
          }, 200);

          progressPercent = 0;
          if (progressEl) progressEl.style.width = '0%';
        };

        const startTimers = () => {
          clearInterval(slideInterval);
          clearInterval(progressInterval);

          if (!isPlaying) return;

          slideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % this.images.length;
            updateSlide();
          }, SLIDE_DURATION);

          const STEP = 100;
          progressInterval = setInterval(() => {
            progressPercent += (STEP / SLIDE_DURATION) * 100;
            if (progressPercent > 100) progressPercent = 0;
            if (progressEl) progressEl.style.width = `${progressPercent}%`;
          }, STEP);
        };

        const stopTimers = () => {
          clearInterval(slideInterval);
          clearInterval(progressInterval);
        };

        updateSlide();
        startTimers();

        document.getElementById('slideshow-prev').onclick = (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex - 1 + this.images.length) % this.images.length;
          updateSlide();
          startTimers();
        };

        document.getElementById('slideshow-next').onclick = (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex + 1) % this.images.length;
          updateSlide();
          startTimers();
        };

        playPauseBtn.onclick = (e) => {
          e.stopPropagation();
          isPlaying = !isPlaying;
          if (isPlaying) {
            playPauseIcon.textContent = 'pause';
            playPauseText.textContent = 'Pause';
            startTimers();
          } else {
            playPauseIcon.textContent = 'play_arrow';
            playPauseText.textContent = 'Play';
            stopTimers();
            if (progressEl) progressEl.style.width = '0%';
          }
        };

        const closeSlideshow = () => {
          stopTimers();
          if (overlayEl) overlayEl.remove();
        };
        document.getElementById('slideshow-close').onclick = closeSlideshow;

        const escHandler = (e) => {
          if (e.key === 'Escape') {
            closeSlideshow();
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
      };
    }

    if (!this.isOwner) return;

    // Toggle options panel
    const settingsBtn = document.getElementById('board-settings-btn');
    const optionsPanel = document.getElementById('board-options-panel');
    if (settingsBtn && optionsPanel) {
      settingsBtn.onclick = () => {
        const isHidden = optionsPanel.style.display === 'none';
        optionsPanel.style.display = isHidden ? 'block' : 'none';
        settingsBtn.style.color = isHidden ? 'var(--accent-primary)' : '';
      };
    }

    // Board upload trigger
    const uploadBtn = document.getElementById('board-upload-btn');
    if (uploadBtn) {
      uploadBtn.onclick = () => {
        if (window.appState && window.appState.showUpload) {
          window.appState.showUpload(this.board.id);
        }
      };
    }

    // Rename Board
    const renameInput = document.getElementById('rename-board-input');
    const renameBtn = document.getElementById('rename-board-btn');
    if (renameBtn && renameInput) {
      renameBtn.onclick = async () => {
        const newName = renameInput.value.trim();
        if (!newName || newName === this.board.name) return;

        renameBtn.disabled = true;
        renameBtn.textContent = 'Renaming...';

        try {
          const accessToken = await getGoogleDriveToken();
          if (accessToken) {
            // Rename in Google Drive
            await renameBoardFolder(accessToken, this.board.drive_folder_id, newName);
          }

          // Rename in Supabase
          const supabase = await getSupabase();
          const { error } = await supabase
            .from('boards')
            .update({ name: newName })
            .eq('id', this.board.id);

          if (error) throw error;
          
          alert("Board renamed successfully.");
          this.board.name = newName;
          this.renderContent();
        } catch (err) {
          alert("Failed to rename board: " + err.message);
        } finally {
          renameBtn.disabled = false;
          renameBtn.textContent = 'Rename';
        }
      };
    }

    // Visibility Toggle (Public / Private)
    const togglePublic = document.getElementById('board-toggle-public');
    const toggleLinkAccess = document.getElementById('board-toggle-link-access');
    const linkAccessContainer = document.getElementById('link-access-container');

    if (togglePublic) {
      togglePublic.onchange = async () => {
        const isPublic = togglePublic.checked;
        if (linkAccessContainer) {
          linkAccessContainer.style.display = isPublic ? 'none' : 'flex';
        }
        const allowLinkAccess = toggleLinkAccess ? toggleLinkAccess.checked : false;
        const newDesc = formatDescriptionWithPrivacy(this.board.description, allowLinkAccess);

        try {
          const supabase = await getSupabase();
          
          const { error: boardErr } = await supabase
            .from('boards')
            .update({ is_public: isPublic, description: newDesc })
            .eq('id', this.board.id);
          
          if (boardErr) throw boardErr;

          const { error: imgErr } = await supabase
            .from('images')
            .update({ is_public: isPublic })
            .eq('board_id', this.board.id);
            
          if (imgErr) throw imgErr;

          this.board.is_public = isPublic;
          this.board.description = newDesc;

          alert(`Collection visibility changed to ${isPublic ? 'Public' : (allowLinkAccess ? 'Private (Unlisted via link)' : 'Strictly Private (Owner only)')}.`);
          this.renderContent();
        } catch (err) {
          alert("Failed to update visibility: " + err.message);
          togglePublic.checked = !isPublic; // Revert
        }
      };
    }

    if (toggleLinkAccess) {
      toggleLinkAccess.onchange = async () => {
        const allowLinkAccess = toggleLinkAccess.checked;
        const newDesc = formatDescriptionWithPrivacy(this.board.description, allowLinkAccess);

        try {
          const supabase = await getSupabase();
          const { error } = await supabase
            .from('boards')
            .update({ description: newDesc })
            .eq('id', this.board.id);

          if (error) throw error;
          this.board.description = newDesc;

          alert(`Link Access updated: ${allowLinkAccess ? 'Anyone with the direct link can view this collection.' : 'Strictly Private - Only you (creator) can access this collection.'}`);
        } catch (err) {
          alert("Failed to update link access: " + err.message);
          toggleLinkAccess.checked = !allowLinkAccess;
        }
      };
    }

    // Delete Board
    const deleteBtn = document.getElementById('delete-board-btn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (confirm(`CRITICAL WARNING: Are you sure you want to delete the board "${this.board.name}"? This will delete all images inside the board, and delete the folder from your Google Drive permanently!`)) {
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting...';

          try {
            const accessToken = await getGoogleDriveToken();
            if (accessToken) {
              // Delete Google Drive folder (deletes all contents inside GDrive too)
              await deleteFromDrive(accessToken, this.board.drive_folder_id);
            }

            // Delete board from Supabase (foreign key cascade deletes images + likes!)
            const supabase = await getSupabase();
            const { error } = await supabase
              .from('boards')
              .delete()
              .eq('id', this.board.id);

            if (error) throw error;
            
            alert("Board deleted successfully.");
            window.appState.navigate('/profile');
          } catch (err) {
            alert("Failed to delete board: " + err.message);
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Board';
          }
        }
      };
    }
  }
};
