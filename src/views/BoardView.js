import { getSupabase, supabasePublic } from '../services/supabase';
import { renderMasonryGrid, setupGridEvents } from '../components/MasonryGrid';
import { renderPinSkeleton } from '../components/Skeleton';
import { renameBoardFolder, deleteFromDrive } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';

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
          <span class="material-icons-outlined" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 16px;">lock</span>
          <h2 style="font-size: 1.5rem; margin-bottom: 8px;">Board is private or does not exist</h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">You do not have permission to view this board.</p>
          <a href="/" class="btn btn-primary">Go Home</a>
        </div>
      `;
      return;
    }

    await this.fetchBoardImages(boardId);
    this.renderContent();
  },

  fetchBoardDetails: async function(boardId) {
    try {
      const user = window.appState?.currentUser;
      const uid = user ? user.uid : null;
      
      // Attempt to query board details. Supabase RLS will restrict it.
      let query;
      if (uid) {
        const supabase = await getSupabase();
        query = supabase.from('boards').select('*, users(*)').eq('id', boardId);
      } else {
        query = supabasePublic.from('boards').select('*, users(*)').eq('id', boardId).eq('is_public', true);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return; // Left as null (meaning not found or unauthorized)
      }

      this.board = data[0];
      this.isOwner = uid && this.board.user_id === uid;
    } catch (err) {
      console.error("Error fetching board details:", err);
    }
  },

  fetchBoardImages: async function(boardId) {
    try {
      const user = window.appState?.currentUser;
      const uid = user ? user.uid : null;

      let query;
      if (uid) {
        const supabase = await getSupabase();
        query = supabase.from('images').select('*, users!images_user_id_fkey(*), boards(*)').eq('board_id', boardId).order('created_at', { ascending: false });
      } else {
        query = supabasePublic.from('images').select('*, users!images_user_id_fkey(*), boards(*)').eq('board_id', boardId).eq('is_public', true).order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      this.images = data || [];
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

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px;">
        <!-- Board Header -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <h1 style="font-size: 2.2rem; font-family: var(--font-heading);">${boardName}</h1>
                <span class="btn-glass" style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 4px;">
                  <span class="material-icons-outlined" style="font-size: 0.9rem;">${isPublic ? 'public' : 'lock'}</span>
                  <span>${isPublic ? 'Public' : 'Private'}</span>
                </span>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 4px;">Created by ${authorName}</p>
            </div>
            
            ${this.isOwner ? `
              <div style="display: flex; gap: 8px;">
                <button id="board-upload-btn" class="btn btn-primary">
                  <span class="material-icons-outlined">add</span>
                  <span>Upload Images</span>
                </button>
                <button id="board-settings-btn" class="btn btn-secondary btn-icon" title="Board Settings">
                  <span class="material-icons-outlined">settings</span>
                </button>
              </div>
            ` : ''}
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
                  <div style="font-weight: 600; font-size: 0.95rem;">Visibility settings</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">Public boards show up in search and exploration.</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="board-toggle-public" ${isPublic ? 'checked' : ''}>
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
          // Open lightbox
          const currentPath = window.location.pathname;
          const currentSearch = window.location.search;
          const connector = currentSearch.includes('?') ? '&' : '?';
          window.appState.navigate(`${currentPath}${currentSearch}${connector}pin=${pinId}`);
        },
        async (pinId, likeBtn) => {
          if (window.appState && window.appState.toggleLike) {
            await window.appState.toggleLike(pinId, likeBtn);
          }
        }
      );
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
    if (togglePublic) {
      togglePublic.onchange = async () => {
        const isPublic = togglePublic.checked;
        try {
          const supabase = await getSupabase();
          
          // Start a transaction-like batch to update board and all its images
          const { error: boardErr } = await supabase
            .from('boards')
            .update({ is_public: isPublic })
            .eq('id', this.board.id);
          
          if (boardErr) throw boardErr;

          const { error: imgErr } = await supabase
            .from('images')
            .update({ is_public: isPublic })
            .eq('board_id', this.board.id);
            
          if (imgErr) throw imgErr;

          alert(`Board visibility changed to ${isPublic ? 'Public' : 'Private'}.`);
          this.board.is_public = isPublic;
          this.renderContent();
        } catch (err) {
          alert("Failed to update visibility: " + err.message);
          togglePublic.checked = !isPublic; // Revert
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
