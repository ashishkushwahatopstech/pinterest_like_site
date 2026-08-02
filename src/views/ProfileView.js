import { getSupabase } from '../services/supabase';
import { renderBoardSkeleton, renderProfileSkeleton } from '../components/Skeleton';
import { getAppStorageUsage } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';
import { getOptimizedImageUrl } from '../utils/image';

export const ProfileView = {
  containerId: 'view-container',
  boards: [],
  likes: [],
  storageUsed: null,
  activeTab: 'boards', // 'boards' | 'likes'
  loading: true,

  render: async function() {
    const user = window.appState?.currentUser;
    if (!user) {
      window.appState.navigate('/');
      return;
    }
    if (window.appState.updateSEO) {
      window.appState.updateSEO("Creator Profile", "Manage your cloud storage collections, edit public details, and explore your liked images gallery.");
    }

    this.boards = [];
    this.likes = [];
    this.storageUsed = null;
    this.loading = true;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Initial loading layout
    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px;">
        ${renderProfileSkeleton()}
        <div style="margin-top: 32px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
          ${renderBoardSkeleton(3)}
        </div>
      </div>
    `;

    // Fetch user boards and likes
    await Promise.all([
      this.fetchUserBoards(),
      this.fetchUserLikes(),
      this.fetchStorageUsage()
    ]);

    this.renderContent();
  },

  fetchUserBoards: async function() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', window.appState.currentUser.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.boards = data || [];
    } catch (err) {
      console.error("Error fetching user boards:", err);
    }
  },

  fetchUserLikes: async function() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('likes')
        .select('*, images(*, users!images_user_id_fkey(*), boards(*))')
        .eq('user_id', window.appState.currentUser.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.likes = data || [];
    } catch (err) {
      console.error("Error fetching user liked images:", err);
    } finally {
      this.loading = false;
    }
  },

  fetchStorageUsage: async function() {
    try {
      const accessToken = await getGoogleDriveToken();
      if (!accessToken) {
        this.storageUsed = -1; // Flag indicating not connected
        return;
      }
      const bytes = await getAppStorageUsage(accessToken);
      this.storageUsed = bytes;
    } catch (err) {
      console.error("Error fetching storage usage:", err);
      this.storageUsed = 0;
    }
  },

  formatBytes: function(bytes) {
    if (bytes === null || bytes === undefined) return 'Calculating...';
    if (bytes === -1) return 'Drive disconnected';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  renderContent: function() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const user = window.appState.currentUser;
    const name = user.displayName || 'Creator';
    const email = user.email;
    const avatar = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

    // Select dynamic cover image from favorite images list or fallback
    const likedImages = this.likes.map(l => l.images).filter(Boolean);
    const rawCover = likedImages.length > 0
      ? (likedImages[0].drive_view_link || `https://lh3.googleusercontent.com/d/${likedImages[0].drive_file_id}`)
      : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';
    const coverUrl = getOptimizedImageUrl(rawCover, 800);

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 24px;">
        <!-- Dynamic Profile Cover Banner -->
        <div class="profile-cover" style="height: 200px; border-radius: var(--radius-lg); overflow: hidden; position: relative; margin-bottom: -50px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <img src="${coverUrl}" style="width: 100%; height: 100%; object-fit: cover; filter: blur(2px) brightness(0.65);" alt="Profile Cover" loading="lazy" decoding="async">
          <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(15,23,42,0.4));"></div>
        </div>

        <!-- Profile info -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; margin-bottom: 32px; position: relative; z-index: 10;">
          <div class="profile-avatar" style="border: 4px solid var(--bg-secondary); box-shadow: var(--shadow-md);">
            <img src="${avatar}" alt="Avatar">
          </div>
          <div>
            <h1 style="font-size: 2rem; font-family: var(--font-heading);">${name}</h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 2px;">${email}</p>
          </div>
          
          <div style="display: flex; gap: 24px; margin-top: 8px;">
            <div class="profile-stat-item">
              <span class="profile-stat-count">${this.boards.length}</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Boards</span>
            </div>
            <div class="profile-stat-item">
              <span class="profile-stat-count">${this.likes.length}</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Likes</span>
            </div>
            <div class="profile-stat-item">
              <span class="profile-stat-count">${this.formatBytes(this.storageUsed)}</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Drive Space Used</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-container">
          <button class="tab-btn ${this.activeTab === 'boards' ? 'active' : ''}" id="tab-boards-btn">My Boards</button>
          <button class="tab-btn ${this.activeTab === 'likes' ? 'active' : ''}" id="tab-likes-btn">My Favorites</button>
        </div>

        <!-- Tab Contents -->
        <div id="tab-content-container">
          ${this.activeTab === 'boards' ? this.renderBoardsTab() : this.renderLikesTab()}
        </div>
      </div>
    `;

    this.setupEvents();
  },

  renderBoardsTab: function() {
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.3rem;">Collections</h2>
        <button id="profile-create-board-btn" class="btn btn-primary">
          <span class="material-icons-outlined">create_new_folder</span>
          <span>New Board</span>
        </button>
      </div>
    `;

    if (this.boards.length === 0) {
      html += `
        <div class="glass text-center" style="padding: 48px 24px; text-align: center; border-radius: var(--radius-md);">
          <span class="material-icons-outlined" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 12px;">folder_open</span>
          <h3 style="font-size: 1.1rem; margin-bottom: 6px;">No boards yet</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">Create a board to start organizing your images.</p>
          <button id="profile-create-board-btn-empty" class="btn btn-primary btn-sm">Create First Board</button>
        </div>
      `;
      return html;
    }

    html += `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        ${this.boards.map(b => `
          <a href="/board/${window.appState.slugify(b.name)}--${b.id}" class="glass board-card" style="padding: 24px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; transition: var(--transition-fast); cursor: pointer; border: 1px solid var(--border-color);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                <h3 style="font-size: 1.25rem; font-family: var(--font-heading); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${b.name}</h3>
                <span class="btn-glass" style="padding: 2px 6px; font-size: 0.65rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 2px;">
                  <span class="material-icons-outlined" style="font-size: 0.75rem;">${b.is_public ? 'public' : 'lock'}</span>
                  <span>${b.is_public ? 'Public' : 'Private'}</span>
                </span>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.8rem;">Click to manage uploads & settings</p>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); align-self: flex-end; display: flex; align-items: center; gap: 4px;">
              <span>Open folder</span>
              <span class="material-icons-outlined" style="font-size: 0.9rem;">open_in_new</span>
            </div>
          </a>
        `).join('')}
      </div>
    `;

    return html;
  },

  renderLikesTab: function() {
    if (this.likes.length === 0) {
      return `
        <div class="glass text-center" style="padding: 48px 24px; text-align: center; border-radius: var(--radius-md);">
          <span class="material-icons-outlined" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 12px;">favorite_border</span>
          <h3 style="font-size: 1.1rem; margin-bottom: 6px;">No favorites yet</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Images you like will appear here.</p>
        </div>
      `;
    }

    // Grid layout for likes
    const likedImages = this.likes.map(l => l.images).filter(Boolean);
    
    // We can use a standard grid layout for simplicity
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        ${likedImages.map(img => {
          const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
          const imageUrl = getOptimizedImageUrl(rawUrl, 400);
          return `
            <div class="pin-card" style="aspect-ratio: 1; position: relative; cursor: pointer; border-radius: var(--radius-md);" class="liked-pin-item" onclick="sessionStorage.setItem('lightbox_referrer', window.location.pathname + window.location.search); window.appState.navigate('/pin/${window.appState.slugify(img.title)}--${img.id}')">
              <img src="${imageUrl}" alt="${img.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async">
              <div class="pin-overlay" style="opacity: 0; hover: opacity: 1;">
                <div class="pin-bottom-info" style="position: absolute; bottom: 12px; left: 12px; right: 12px;">
                  <h4 style="font-size: 0.85rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${img.title}</h4>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  setupEvents: function() {
    // Tab switching
    const boardsTab = document.getElementById('tab-boards-btn');
    const likesTab = document.getElementById('tab-likes-btn');
    const content = document.getElementById('tab-content-container');

    if (boardsTab && likesTab && content) {
      boardsTab.onclick = () => {
        this.activeTab = 'boards';
        boardsTab.classList.add('active');
        likesTab.classList.remove('active');
        content.innerHTML = this.renderBoardsTab();
        this.setupTabEvents();
      };

      likesTab.onclick = () => {
        this.activeTab = 'likes';
        likesTab.classList.add('active');
        boardsTab.classList.remove('active');
        content.innerHTML = this.renderLikesTab();
        this.setupTabEvents();
      };
    }

    this.setupTabEvents();
  },

  setupTabEvents: function() {
    // Create Board trigger
    const createBtn = document.getElementById('profile-create-board-btn');
    const createBtnEmpty = document.getElementById('profile-create-board-btn-empty');

    const triggerCreate = () => {
      if (window.appState && window.appState.showCreateBoard) {
        window.appState.showCreateBoard();
      }
    };

    if (createBtn) createBtn.onclick = triggerCreate;
    if (createBtnEmpty) createBtnEmpty.onclick = triggerCreate;
  }
};
