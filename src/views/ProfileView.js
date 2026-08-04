import { renderBreadcrumb } from '../components/Breadcrumb';
import { getSupabase } from '../services/supabase';
import { renderBoardSkeleton, renderProfileSkeleton } from '../components/Skeleton';
import { getAppStorageUsage } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';
import { getOptimizedImageUrl } from '../utils/image';
import { canUserAccessRecord } from '../utils/privacy';

export const ProfileView = {
  containerId: 'view-container',
  profile: null,
  boards: [],
  likes: [],
  storageUsed: null,
  activeTab: 'boards', // 'boards' | 'likes'
  isSelf: false,
  loading: true,

  render: async function(params = {}) {
    const user = window.appState?.currentUser;
    const targetUsername = params.username || null;

    this.boards = [];
    this.likes = [];
    this.storageUsed = null;
    this.loading = true;
    this.profile = null;
    this.isSelf = false;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Fetch Target User Profile
    const supabase = await getSupabase();
    if (targetUsername) {
      const { data: uByHandle } = await supabase.from('users').select('*').eq('username', targetUsername).single();
      if (uByHandle) {
        this.profile = uByHandle;
      } else {
        const { data: uById } = await supabase.from('users').select('*').eq('id', targetUsername).single();
        this.profile = uById;
      }
    }

    if (!this.profile && user) {
      this.profile = window.appState.currentUserProfile || {
        id: user.uid,
        display_name: user.displayName,
        email: user.email,
        avatar_url: user.photoURL
      };
    }

    if (!this.profile) {
      window.appState.navigate('/');
      return;
    }

    this.isSelf = user && user.uid === this.profile.id;

    if (window.appState.updateSEO) {
      const titleName = this.profile.channel_name || this.profile.display_name || 'Creator Profile';
      const handleTag = this.profile.username ? `@${this.profile.username}` : '';
      window.appState.updateSEO(`${titleName} ${handleTag}`, this.profile.channel_bio || "Explore collections and public artwork.");
    }

    // Initial loading layout
    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px;">
        ${renderProfileSkeleton()}
        <div style="margin-top: 32px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
          ${renderBoardSkeleton(3)}
        </div>
      </div>
    `;

    // Fetch user boards, likes, and storage
    await Promise.all([
      this.fetchUserBoards(),
      this.fetchUserLikes(),
      this.isSelf ? this.fetchStorageUsage() : Promise.resolve()
    ]);

    this.renderContent();
  },

  fetchUserBoards: async function() {
    try {
      const supabase = await getSupabase();
      let boardQuery = supabase
        .from('boards')
        .select('*')
        .eq('user_id', this.profile.id)
        .order('created_at', { ascending: false });

      if (!this.isSelf && !window.appState.isAdmin) {
        boardQuery = boardQuery.eq('is_public', true);
      }

      const { data, error } = await boardQuery;

      if (error) throw error;
      this.boards = data || [];
    } catch (err) {
      console.error("Error fetching user boards:", err);
    }
  },

  fetchUserLikes: async function() {
    try {
      const user = window.appState.currentUser;
      const isAdmin = window.appState.isAdmin;
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('likes')
        .select('*, images(*, users!images_user_id_fkey(*), boards(*))')
        .eq('user_id', this.profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rawLikes = data || [];
      // Filter out any liked image that became strictly private or unauthorized
      this.likes = rawLikes.filter(l => l.images && canUserAccessRecord(l.images, user, isAdmin) && (!l.images.boards || canUserAccessRecord(l.images.boards, user, isAdmin)));
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

    const profile = this.profile;
    const channelName = profile.channel_name || profile.display_name || 'Creator';
    const username = profile.username ? `@${profile.username}` : '';
    const bio = profile.channel_bio || '';
    const avatar = profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

    // Select dynamic cover image from favorite images list or fallback
    const likedImages = this.likes.map(l => l.images).filter(Boolean);
    const rawCover = likedImages.length > 0
      ? (likedImages[0].drive_view_link || `https://lh3.googleusercontent.com/d/${likedImages[0].drive_file_id}`)
      : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';
    const coverUrl = getOptimizedImageUrl(rawCover, 800);

    const breadcrumbHtml = renderBreadcrumb([
      { label: 'Home', url: '/', icon: 'home' },
      { label: this.isSelf ? 'My Profile' : (username || channelName), icon: 'person' }
    ]);

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 20px; max-width: 1000px; box-sizing: border-box;">
        ${breadcrumbHtml}
        
        <!-- Dynamic Responsive Profile Cover Banner -->
        <div class="profile-cover-banner" style="height: 160px; border-radius: var(--radius-lg); overflow: hidden; position: relative; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <img src="${coverUrl}" style="width: 100%; height: 100%; object-fit: cover; filter: blur(2px) brightness(0.65);" alt="Profile Cover" loading="lazy" decoding="async">
          <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(15,23,42,0.5));"></div>
        </div>

        <!-- Profile Info Wrapper -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; margin-bottom: 28px; position: relative; z-index: 10; margin-top: -45px; padding: 0 12px; box-sizing: border-box;">
          <div class="profile-avatar-wrapper" style="width: 90px; height: 90px; border-radius: 50%; border: 4px solid var(--bg-secondary); box-shadow: var(--shadow-md); overflow: hidden; background: var(--bg-tertiary); flex-shrink: 0;">
            <img src="${avatar}" alt="${channelName}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          
          <div style="width: 100%; max-width: 600px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <h1 style="font-size: 1.5rem; font-family: var(--font-heading); font-weight: 800; margin: 0; word-break: break-word;">${channelName}</h1>
              ${username ? `
                <span class="btn-glass" style="padding: 3px 10px; font-size: 0.75rem; border-radius: var(--radius-full); font-weight: 700; color: var(--accent-primary); border: 1px solid rgba(255, 51, 102, 0.3); background: rgba(255, 51, 102, 0.1);">
                  ${username}
                </span>
              ` : ''}
            </div>

            ${bio ? `
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 6px 0 0 0; max-width: 500px; line-height: 1.5; word-break: break-word; margin-left: auto; margin-right: auto;">${bio}</p>
            ` : ''}
          </div>
          
          <!-- Responsive Stats Pill Capsule -->
          <div class="profile-stats-card glass" style="display: flex; align-items: center; justify-content: space-evenly; gap: 12px; padding: 10px 16px; border-radius: var(--radius-full); border: 1px solid var(--border-color); width: 100%; max-width: 440px; box-shadow: var(--shadow-sm); box-sizing: border-box;">
            <div class="profile-stat-item" style="text-align: center; flex: 1;">
              <span class="profile-stat-count" style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); display: block;">${this.boards.length}</span>
              <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Collections</span>
            </div>
            <div style="width: 1px; height: 24px; background: var(--border-color);"></div>
            <div class="profile-stat-item" style="text-align: center; flex: 1;">
              <span class="profile-stat-count" style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); display: block;">${this.likes.length}</span>
              <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Likes</span>
            </div>
            ${this.isSelf && this.storageUsed !== null ? `
              <div style="width: 1px; height: 24px; background: var(--border-color);"></div>
              <div class="profile-stat-item" style="text-align: center; flex: 1;">
                <span class="profile-stat-count" style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); display: block;">${this.formatBytes(this.storageUsed)}</span>
                <span style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Drive Space</span>
              </div>
            ` : ''}
          </div>

          ${this.isSelf ? `
            <div style="margin-top: 4px;">
              <button onclick="window.appState.navigate('/settings?tab=channel')" class="btn btn-secondary btn-sm" style="padding: 8px 18px; font-size: 0.8rem; font-weight: 700; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary);">
                <span class="material-icons-outlined" style="font-size: 1rem; color: var(--accent-primary);">tune</span>
                <span>Edit Creator Channel</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Responsive Navigation Tabs -->
        <div class="tabs-container" style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px;">
          <button class="tab-btn ${this.activeTab === 'boards' ? 'active' : ''}" id="tab-boards-btn" style="padding: 10px 18px; font-weight: 700; font-size: 0.9rem;">
            <span>${this.isSelf ? 'My Collections' : 'Collections'} (${this.boards.length})</span>
          </button>
          <button class="tab-btn ${this.activeTab === 'likes' ? 'active' : ''}" id="tab-likes-btn" style="padding: 10px 18px; font-weight: 700; font-size: 0.9rem;">
            <span>${this.isSelf ? 'My Favorites' : 'Favorites'} (${this.likes.length})</span>
          </button>
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
          <a href="${window.appState.getBoardUrl(b)}" class="glass board-card" style="padding: 24px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; transition: var(--transition-fast); cursor: pointer; border: 1px solid var(--border-color);">
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
            <div class="pin-card" style="aspect-ratio: 1; position: relative; cursor: pointer; border-radius: var(--radius-md);" class="liked-pin-item" onclick="sessionStorage.setItem('lightbox_referrer', window.location.pathname + window.location.search); window.appState.navigate(window.appState.getPinUrl(img))">
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
