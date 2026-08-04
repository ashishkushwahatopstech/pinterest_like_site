import { renderBreadcrumb } from '../components/Breadcrumb';
import { getSupabase, isUserAdmin } from '../services/supabase';
import { renderAdminSkeleton } from '../components/Skeleton';
import { deleteFromDrive } from '../services/drive';
import { getGoogleDriveToken } from '../services/api';

export const AdminView = {
  containerId: 'view-container',
  users: [],
  images: [],
  boards: [],
  trendingBoardIds: [],
  moderationPage: 0,
  moderationPageSize: 10,
  moderationHasMore: false,
  stats: {
    totalUsers: 0,
    totalImages: 0,
    totalStorageEst: 0,
  },
  settings: {
    site_name: 'PinGrid',
    announcement: '',
    allow_signups: true
  },
  auditLogs: [],
  loading: true,

  render: async function() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.loading = true;

    // Show loading skeleton
    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px;">
        <h1 style="font-size: 2rem; margin-bottom: 24px;">Admin Control Panel</h1>
        ${renderAdminSkeleton()}
      </div>
    `;

    // Security check: is the user really an admin?
    const adminCheck = await isUserAdmin();
    if (!adminCheck) {
      container.innerHTML = `
        <div class="container text-center" style="padding: 80px 24px; text-align: center;">
          <span class="material-icons-outlined" style="font-size: 4rem; color: #ef4444; margin-bottom: 16px;">gpp_bad</span>
          <h2 style="font-size: 1.6rem; margin-bottom: 8px;">Access Denied</h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">You must be an administrator to access this page.</p>
          <a href="/" class="btn btn-primary">Go Home</a>
        </div>
      `;
      return;
    }

    // Reset pagination
    this.moderationPage = 0;
    this.images = [];
    this.moderationHasMore = false;

    // Update browser title and Open Graph tags for SEO
    if (window.appState.updateSEO) {
      window.appState.updateSEO("Admin control panel", "Moderate uploaded content, manage user registrations, and view stats.");
    }

    await Promise.all([
      this.fetchStats(),
      this.fetchUsers(),
      this.fetchImages(false),
      this.fetchBoards(),
      this.fetchSiteSettings()
    ]);

    // Expose audit logging globally
    window.appState.logAdminEvent = (action) => this.logAdminEvent(action);

    this.loading = false;
    this.renderContent();
  },

  fetchStats: async function() {
    try {
      const supabase = await getSupabase();
      
      // Get count of users
      const { count: userCount, error: userErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (userErr) throw userErr;
      this.stats.totalUsers = userCount || 0;

      // Get count of images
      const { count: imageCount, error: imageErr } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true });
      if (imageErr) throw imageErr;
      this.stats.totalImages = imageCount || 0;

      // Estimate total storage size (1.5MB average size per image uploaded)
      const { data: sizes, error: sizeErr } = await supabase
        .from('images')
        .select('id');
      if (sizeErr) throw sizeErr;
      
      this.stats.totalStorageEst = (sizes?.length || 0) * 1.5 * 1024 * 1024; // in bytes
    } catch (err) {
      console.error("Error fetching admin stats:", err);
    }
  },

  fetchUsers: async function() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.users = data || [];
    } catch (err) {
      console.error("Error fetching admin users:", err);
    }
  },

  fetchImages: async function(append = false) {
    try {
      const supabase = await getSupabase();
      const from = this.moderationPage * this.moderationPageSize;
      const to = from + this.moderationPageSize - 1;

      const { data, error } = await supabase
        .from('images')
        .select('*, users!images_user_id_fkey(*), boards(*)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      const newImages = data || [];
      if (append) {
        this.images = [...this.images, ...newImages];
      } else {
        this.images = newImages;
      }
      this.moderationHasMore = newImages.length === this.moderationPageSize;
    } catch (err) {
      console.error("Error fetching admin images:", err);
    }
  },

  fetchBoards: async function() {
    try {
      const supabase = await getSupabase();
      
      // Fetch boards
      const { data, error } = await supabase
        .from('boards')
        .select('*, users(*)')
        .order('name');
      if (error) throw error;
      this.boards = data || [];

      // Fetch trending boards settings
      const { data: settingsData, error: settingsErr } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'trending_boards')
        .single();
        
      if (!settingsErr && settingsData) {
        this.trendingBoardIds = JSON.parse(settingsData.value) || [];
      } else {
        this.trendingBoardIds = [];
      }
    } catch (err) {
      console.error("Error fetching admin boards:", err);
      this.trendingBoardIds = [];
    }
  },

  fetchSiteSettings: async function() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;
      
      this.settings = {
        site_name: 'PinGrid',
        announcement: '',
        allow_signups: true
      };
      
      data?.forEach(s => {
        try {
          this.settings[s.key] = JSON.parse(s.value);
        } catch (e) {
          this.settings[s.key] = s.value;
        }
      });

      const rawLogs = this.settings.system_audit_logs;
      this.auditLogs = Array.isArray(rawLogs) ? rawLogs : [];
    } catch (err) {
      console.error("Error fetching site settings:", err);
    }
  },

  logAdminEvent: async function(actionText) {
    try {
      const supabase = await getSupabase();
      
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'system_audit_logs')
        .single();
        
      let logs = [];
      if (data) {
        try {
          logs = JSON.parse(data.value) || [];
        } catch (e) {
          logs = [];
        }
      }
      
      logs.unshift({
        timestamp: new Date().toISOString(),
        admin_email: window.appState.currentUser?.email || 'Admin',
        action: actionText
      });
      
      logs = logs.slice(0, 50); // Cap at 50 logs
      
      await supabase
        .from('site_settings')
        .upsert({ key: 'system_audit_logs', value: JSON.stringify(logs) });
      
      this.auditLogs = logs;
    } catch (err) {
      console.warn("Failed to log admin action:", err);
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

    // Calculate dynamic storage percentage
    const maxStorage = 15 * 1024 * 1024 * 1024; // 15GB
    const storagePercent = ((this.stats.totalStorageEst / maxStorage) * 100).toFixed(2);

    const breadcrumbHtml = renderBreadcrumb([
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Admin Dashboard', icon: 'admin_panel_settings' }
    ]);

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px; padding-bottom: 60px;">
        ${breadcrumbHtml}
        <h1 style="font-size: 2.2rem; margin-bottom: 24px; font-family: var(--font-heading); color: var(--text-primary);">Admin Control Panel</h1>
        
        <!-- Stats Overview Grid -->
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 32px;">
          <div class="stat-card glass" style="padding: 20px; border-radius: var(--radius-md);">
            <span class="stat-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Total Users</span>
            <span class="stat-val" style="display: block; font-size: 1.8rem; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${this.stats.totalUsers}</span>
          </div>
          <div class="stat-card glass" style="padding: 20px; border-radius: var(--radius-md);">
            <span class="stat-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Total Images</span>
            <span class="stat-val" style="display: block; font-size: 1.8rem; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${this.stats.totalImages}</span>
          </div>
          <div class="stat-card glass" style="padding: 20px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <span class="stat-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Est. Aggregate Storage</span>
              <span class="stat-val" style="display: block; font-size: 1.8rem; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${this.formatBytes(this.stats.totalStorageEst)}</span>
            </div>
            <!-- Progress Bar -->
            <div style="margin-top: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px;">
                <span>Usage (vs 15GB Drive Limit)</span>
                <span>${storagePercent}%</span>
              </div>
              <div style="width: 100%; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; border: 1px solid var(--border-color);">
                <div style="height: 100%; width: ${Math.min(storagePercent, 100)}%; background: var(--accent-gradient);"></div>
              </div>
            </div>
          </div>
          <div class="stat-card glass" style="padding: 20px; border-radius: var(--radius-md);">
            <span class="stat-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Signups Status</span>
            <span class="stat-val" style="display: block; font-size: 1.4rem; font-weight: 700; margin-top: 6px; color: ${this.settings.allow_signups ? '#22c55e' : '#ef4444'};">
              ${this.settings.allow_signups ? 'ALLOWING SIGNUPS' : 'SIGNUPS DISABLED'}
            </span>
          </div>
        </div>

        <!-- Admin Views Tabs / Layout -->
        <div class="admin-layout" style="display: flex; gap: 24px; flex-wrap: wrap;">
          <!-- User, Content, and Boards lists -->
          <div class="glass" style="padding: 28px; border-radius: var(--radius-lg); flex: 2; overflow-x: auto; min-width: 320px;">
            <div class="tabs-container" style="margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
              <button class="tab-btn active" id="admin-tab-users" style="cursor: pointer;">User Directory</button>
              <button class="tab-btn" id="admin-tab-content" style="cursor: pointer;">Moderation Queue</button>
              <button class="tab-btn" id="admin-tab-boards" style="cursor: pointer;">Boards Directory</button>
              <button class="tab-btn" id="admin-tab-logs" style="cursor: pointer;">System Audit Logs</button>
            </div>

            <!-- Users Section -->
            <div id="admin-users-panel">
              <div class="form-group" style="margin-bottom: 20px;">
                <input type="text" id="admin-user-search" class="form-control" placeholder="Search users by name or email...">
              </div>
              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Registered</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="admin-user-rows">
                    ${this.renderUserRows(this.users)}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Content Section (Hidden initially) -->
            <div id="admin-content-panel" style="display: none;">
              <div class="form-group" style="margin-bottom: 20px;">
                <input type="text" id="admin-content-search" class="form-control" placeholder="Search moderation queue by title, board, or uploader email...">
              </div>
              <div class="admin-table-wrapper" style="max-height: 480px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0;">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Title & Board</th>
                      <th>Uploader</th>
                      <th>Visibility</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="admin-content-rows">
                    ${this.renderContentRows(this.images)}
                  </tbody>
                </table>
              </div>
              <div style="display: flex; justify-content: center; margin-top: 16px;">
                <button id="admin-moderation-load-more" class="btn btn-secondary btn-sm" style="display: none; width: 100%; max-width: 200px; cursor: pointer;">Show More</button>
              </div>
            </div>

            <!-- Boards Section (Hidden initially) -->
            <div id="admin-boards-panel" style="display: none;">
              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Board Name</th>
                      <th>Creator</th>
                      <th>Visibility</th>
                      <th>Trend Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="admin-board-rows">
                    ${this.renderBoardRows(this.boards)}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Audit Logs Section (Hidden initially) -->
            <div id="admin-logs-panel" style="display: none;">
              <div class="admin-table-wrapper" style="max-height: 480px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0;">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Admin Email</th>
                      <th>Action Performed</th>
                    </tr>
                  </thead>
                  <tbody id="admin-log-rows">
                    ${this.renderLogRows()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Configuration sidebar -->
          <div class="glass" style="padding: 28px; border-radius: var(--radius-lg); height: fit-content; min-width: 280px; flex: 1;">
            <h3 style="font-size: 1.2rem; margin-bottom: 20px; font-family: var(--font-heading); color: var(--text-primary);">System Config</h3>
            
            <form id="system-config-form">
              <div class="form-group">
                <label class="form-label">Site Name</label>
                <input type="text" id="config-site-name" class="form-control" value="${this.settings.site_name || 'PinGrid'}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Announcement Banner</label>
                <input type="text" id="config-announcement" class="form-control" value="${this.settings.announcement || ''}" placeholder="Banner text (leave empty to hide)">
              </div>

              <div class="form-group" style="margin-top: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">Allow New Registrations</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Allow anyone to sign up.</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="config-allow-signups" ${this.settings.allow_signups ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <div class="form-group" style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">Require Ads for PRO Features</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Turn ON after AdSense approval. Keep OFF for direct free 4K downloads & AI tools.</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="config-enable-reward-ads" ${this.settings.enable_reward_ads ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <button type="submit" id="config-save-btn" class="btn btn-primary" style="width: 100%; margin-top: 24px;">
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  },

  renderUserRows: function(userList) {
    if (userList.length === 0) {
      return `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>`;
    }

    return userList.map(u => `
      <tr id="user-row-${u.id}">
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="${u.display_name || 'Creator'} Avatar" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border-color);">
            <div>
              <div style="font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; color: var(--text-primary);">
                <span>${u.display_name || u.channel_name || 'Creator'}</span>
                ${u.username ? `
                  <span class="btn-glass" style="padding: 1px 7px; font-size: 0.7rem; border-radius: var(--radius-full); font-weight: 700; color: var(--accent-primary); border: 1px solid rgba(255,51,102,0.3); background: rgba(255,51,102,0.1);">
                    @${u.username}
                  </span>
                ` : ''}
                ${u.is_admin ? `<span class="material-icons-outlined" style="font-size: 1rem; color: var(--accent-primary);" title="Admin Access">verified_user</span>` : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${u.email}</div>
            </div>
          </div>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <span id="user-badge-${u.id}" class="btn-glass" style="padding: 2px 6px; font-size: 0.7rem; border-radius: var(--radius-sm); color: ${u.is_suspended ? '#ef4444' : '#22c55e'}; background: ${u.is_suspended ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'}">
            ${u.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-glass btn-sm btn-suspend" data-id="${u.id}" data-status="${u.is_suspended}" style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer;">
              ${u.is_suspended ? 'Reactivate' : 'Suspend'}
            </button>
            <button class="btn btn-glass btn-sm btn-toggle-admin" data-id="${u.id}" data-admin="${u.is_admin}" style="padding: 4px 10px; font-size: 0.75rem; border-color: ${u.is_admin ? 'var(--accent-primary)' : 'var(--border-color)'}; color: ${u.is_admin ? 'var(--accent-primary)' : 'var(--text-secondary)'}; cursor: pointer;">
              ${u.is_admin ? 'Revoke Admin' : 'Make Admin'}
            </button>
            <button class="btn btn-danger btn-sm btn-delete-user" data-id="${u.id}" style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer;">
              Delete DB
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderContentRows: function(imageList) {
    if (imageList.length === 0) {
      return `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No images found in moderation scope.</td></tr>`;
    }

    return imageList.map(img => {
      const thumbUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
      return `
        <tr id="img-row-${img.id}">
          <td>
            <img src="${thumbUrl}" alt="${img.title} Thumbnail" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;" onclick="sessionStorage.setItem('lightbox_referrer', '/admin'); window.appState.navigate(window.appState.getPinUrl(img))">
          </td>
          <td>
            <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; color: var(--text-primary);">${img.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Board: ${img.boards?.name || 'Unassigned'}</div>
            <div style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);">${img.users?.display_name || 'Anonymous'}</div>
          </td>
          <td>
            <span id="img-badge-${img.id}" class="btn-glass" style="padding: 2px 6px; font-size: 0.7rem; border-radius: var(--radius-sm); color: ${img.is_public ? '#22c55e' : '#fbbf24'}; background: ${img.is_public ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}">
              ${img.is_public ? 'PUBLIC' : 'HIDDEN'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-glass btn-sm btn-hide-image" data-id="${img.id}" data-status="${img.is_public}" style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer;">
                ${img.is_public ? 'Hide' : 'Publish'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderBoardRows: function(boardList) {
    if (boardList.length === 0) {
      return `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No boards created yet.</td></tr>`;
    }

    return boardList.map(b => {
      const isTrending = this.trendingBoardIds.includes(b.id);
      return `
        <tr id="board-row-${b.id}">
          <td>
            <div style="font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
               <span class="material-icons-outlined" style="color: var(--text-secondary);">folder</span>
               <span>${b.name}</span>
            </div>
          </td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);">${b.users?.display_name || 'Anonymous'}</div>
          </td>
          <td>
            <span class="btn-glass" style="padding: 2px 6px; font-size: 0.7rem; border-radius: var(--radius-sm); color: ${b.is_public ? '#22c55e' : '#f59e0b'}; background: ${b.is_public ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}">
              ${b.is_public ? 'PUBLIC' : 'PRIVATE'}
            </span>
          </td>
          <td>
            <span id="board-trend-badge-${b.id}" class="btn-glass" style="padding: 2px 6px; font-size: 0.7rem; border-radius: var(--radius-sm); color: ${isTrending ? '#ff3366' : 'var(--text-secondary)'}; background: ${isTrending ? 'rgba(255,51,102,0.1)' : 'var(--hover-bg)'}">
              ${isTrending ? 'TRENDING' : 'STANDARD'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-glass btn-sm btn-trend-board" data-id="${b.id}" data-status="${isTrending}" style="padding: 4px 10px; font-size: 0.75rem; color: ${isTrending ? '#ff3366' : 'var(--text-primary)'}; cursor: pointer;">
                ${isTrending ? 'Remove Trend' : 'Make Trend'}
              </button>
              <button class="btn btn-danger btn-sm btn-delete-board" data-id="${b.id}" style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer;">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderLogRows: function() {
    if (!this.auditLogs || this.auditLogs.length === 0) {
      return `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 24px;">No system actions logged yet.</td></tr>`;
    }

    return this.auditLogs.map(log => `
      <tr>
        <td style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">
          ${new Date(log.timestamp).toLocaleString()}
        </td>
        <td style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); white-space: nowrap;">
          ${log.admin_email}
        </td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">
          ${log.action}
        </td>
      </tr>
    `).join('');
  },

  setupEvents: function() {
    // Tab controls
    const tabUsers = document.getElementById('admin-tab-users');
    const tabContent = document.getElementById('admin-tab-content');
    const tabBoards = document.getElementById('admin-tab-boards');
    const tabLogs = document.getElementById('admin-tab-logs');
    
    const usersPanel = document.getElementById('admin-users-panel');
    const contentPanel = document.getElementById('admin-content-panel');
    const boardsPanel = document.getElementById('admin-boards-panel');
    const logsPanel = document.getElementById('admin-logs-panel');
    
    if (tabUsers && tabContent && tabBoards && tabLogs && usersPanel && contentPanel && boardsPanel && logsPanel) {
      tabUsers.onclick = () => {
        tabUsers.classList.add('active');
        tabContent.classList.remove('active');
        tabBoards.classList.remove('active');
        tabLogs.classList.remove('active');
        usersPanel.style.display = 'block';
        contentPanel.style.display = 'none';
        boardsPanel.style.display = 'none';
        logsPanel.style.display = 'none';
      };

      tabContent.onclick = () => {
        tabContent.classList.add('active');
        tabUsers.classList.remove('active');
        tabBoards.classList.remove('active');
        tabLogs.classList.remove('active');
        usersPanel.style.display = 'none';
        contentPanel.style.display = 'block';
        boardsPanel.style.display = 'none';
        logsPanel.style.display = 'none';
      };

      tabBoards.onclick = () => {
        tabBoards.classList.add('active');
        tabUsers.classList.remove('active');
        tabContent.classList.remove('active');
        tabLogs.classList.remove('active');
        usersPanel.style.display = 'none';
        contentPanel.style.display = 'none';
        boardsPanel.style.display = 'block';
        logsPanel.style.display = 'none';
      };

      tabLogs.onclick = () => {
        tabLogs.classList.add('active');
        tabUsers.classList.remove('active');
        tabContent.classList.remove('active');
        tabBoards.classList.remove('active');
        usersPanel.style.display = 'none';
        contentPanel.style.display = 'none';
        boardsPanel.style.display = 'none';
        logsPanel.style.display = 'block';
        
        const logsContainer = document.getElementById('admin-log-rows');
        if (logsContainer) {
          logsContainer.innerHTML = this.renderLogRows();
        }
      };
    }

    // User Search Input filter
    const userSearchInput = document.getElementById('admin-user-search');
    if (userSearchInput) {
      userSearchInput.oninput = () => {
        const query = userSearchInput.value.toLowerCase();
        const filtered = this.users.filter(u => 
          u.display_name?.toLowerCase().includes(query) || 
          u.email?.toLowerCase().includes(query) ||
          u.username?.toLowerCase().includes(query) ||
          u.channel_name?.toLowerCase().includes(query)
        );
        const rowsContainer = document.getElementById('admin-user-rows');
        if (rowsContainer) {
          rowsContainer.innerHTML = this.renderUserRows(filtered);
          this.attachUserActionEvents();
        }
      };
    }

    // Content Moderation Queue search filter
    const contentSearchInput = document.getElementById('admin-content-search');
    if (contentSearchInput) {
      contentSearchInput.oninput = () => {
        const query = contentSearchInput.value.toLowerCase();
        const filtered = this.images.filter(img => 
          img.title?.toLowerCase().includes(query) || 
          img.boards?.name?.toLowerCase().includes(query) || 
          img.users?.email?.toLowerCase().includes(query)
        );
        const rowsContainer = document.getElementById('admin-content-rows');
        if (rowsContainer) {
          rowsContainer.innerHTML = this.renderContentRows(filtered);
          this.attachContentActionEvents();
        }
      };
    }

    // Moderation Queue Show More click event
    const loadMoreBtn = document.getElementById('admin-moderation-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = this.moderationHasMore ? 'block' : 'none';
      
      loadMoreBtn.onclick = async () => {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
        
        this.moderationPage++;
        await this.fetchImages(true); // Fetch and append
        
        const tbody = document.getElementById('admin-content-rows');
        if (tbody) {
          tbody.innerHTML = this.renderContentRows(this.images);
          this.attachContentActionEvents(); // re-bind hides/publishes
        }
        
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Show More';
        loadMoreBtn.style.display = this.moderationHasMore ? 'block' : 'none';
      };
    }

    this.attachUserActionEvents();
    this.attachContentActionEvents();
    this.attachBoardActionEvents();

    // System configuration saving
    const configForm = document.getElementById('system-config-form');
    const saveBtn = document.getElementById('config-save-btn');
    if (configForm) {
      configForm.onsubmit = async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const siteName = document.getElementById('config-site-name').value.trim();
        const announcement = document.getElementById('config-announcement').value.trim();
        const allowSignups = document.getElementById('config-allow-signups').checked;
        const enableRewardAds = document.getElementById('config-enable-reward-ads').checked;

        try {
          const supabase = await getSupabase();
          
          await supabase.from('site_settings').upsert({ key: 'site_name', value: JSON.stringify(siteName) });
          await supabase.from('site_settings').upsert({ key: 'announcement', value: JSON.stringify(announcement) });
          await supabase.from('site_settings').upsert({ key: 'allow_signups', value: JSON.stringify(allowSignups) });
          await supabase.from('site_settings').upsert({ key: 'enable_reward_ads', value: JSON.stringify(enableRewardAds) });

          await this.logAdminEvent(`Updated site configurations. Name: "${siteName}", Allow Signups: ${allowSignups}, Require Ads: ${enableRewardAds}`);

          alert("Configuration saved successfully.");
          this.settings = { site_name: siteName, announcement, allow_signups: allowSignups, enable_reward_ads: enableRewardAds };
          if (window.appState?.siteSettings) {
            window.appState.siteSettings.enable_reward_ads = enableRewardAds;
          }
          this.renderContent();
        } catch (err) {
          alert("Failed to save config: " + err.message);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Configuration';
        }
      };
    }
  },

  attachUserActionEvents: function() {
    const supabaseCaller = async () => await getSupabase();
    
    // Suspend / Reactivate handler
    document.querySelectorAll('.btn-suspend').forEach(btn => {
      btn.onclick = async () => {
        const userId = btn.dataset.id;
        const isSuspended = btn.dataset.status === 'true';
        const newStatus = !isSuspended;
        
        btn.disabled = true;
        
        try {
          const supabase = await supabaseCaller();
          const { error } = await supabase
            .from('users')
            .update({ is_suspended: newStatus })
            .eq('id', userId);

          if (error) throw error;
          
          const userObj = this.users.find(u => u.id === userId);
          await this.logAdminEvent(`${newStatus ? 'Suspended' : 'Activated'} registration for uploader: ${userObj?.email || userId}`);

          alert(`User successfully ${newStatus ? 'suspended' : 'reactivated'}.`);
          btn.dataset.status = newStatus.toString();
          btn.textContent = newStatus ? 'Reactivate' : 'Suspend';
          
          const badge = document.getElementById(`user-badge-${userId}`);
          if (badge) {
            badge.textContent = newStatus ? 'SUSPENDED' : 'ACTIVE';
            badge.style.color = newStatus ? '#ef4444' : '#22c55e';
            badge.style.background = newStatus ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';
          }
        } catch (err) {
          alert("Failed to update user status: " + err.message);
        } finally {
          btn.disabled = false;
        }
      };
    });

    // Toggle Admin status handler
    document.querySelectorAll('.btn-toggle-admin').forEach(btn => {
      btn.onclick = async () => {
        const userId = btn.dataset.id;
        const isAdmin = btn.dataset.admin === 'true';
        const newStatus = !isAdmin;
        
        const currentUser = window.appState?.currentUser;
        if (currentUser && currentUser.uid === userId && isAdmin) {
          alert("You cannot revoke admin privileges from yourself!");
          return;
        }

        btn.disabled = true;
        
        try {
          const supabase = await supabaseCaller();
          const { error } = await supabase
            .from('users')
            .update({ is_admin: newStatus })
            .eq('id', userId);

          if (error) throw error;
          
          const userObj = this.users.find(u => u.id === userId);
          await this.logAdminEvent(`${newStatus ? 'Granted' : 'Revoked'} administrator role for: ${userObj?.email || userId}`);

          alert(`User successfully ${newStatus ? 'promoted to admin' : 'demoted from admin'}.`);
          btn.dataset.admin = newStatus.toString();
          btn.textContent = newStatus ? 'Revoke Admin' : 'Make Admin';
          btn.style.borderColor = newStatus ? 'var(--accent-primary)' : 'var(--border-color)';
          btn.style.color = newStatus ? 'var(--accent-primary)' : 'var(--text-secondary)';
          
          await this.fetchUsers();
          const tbody = document.getElementById('admin-user-rows');
          if (tbody) {
            tbody.innerHTML = this.renderUserRows(this.users);
            this.attachUserActionEvents();
          }
        } catch (err) {
          alert("Failed to toggle admin status: " + err.message);
        } finally {
          btn.disabled = false;
        }
      };
    });

    // Delete user database records handler
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.onclick = async () => {
        const userId = btn.dataset.id;
        if (confirm("Are you sure you want to delete this user's records from PinGrid database? Google Drive files will not be touched, but all database rows (credentials, boards, images, likes) will cascade delete permanently.")) {
          btn.disabled = true;
          try {
            const userObj = this.users.find(u => u.id === userId);
            const supabase = await supabaseCaller();
            const { error } = await supabase
              .from('users')
              .delete()
              .eq('id', userId);

            if (error) throw error;

            await this.logAdminEvent(`Cascade deleted uploader references for: ${userObj?.email || userId}`);

            alert("User records deleted from database successfully.");
            const row = document.getElementById(`user-row-${userId}`);
            if (row) row.remove();
          } catch (err) {
            alert("Failed to delete user records: " + err.message);
            btn.disabled = false;
          }
        }
      };
    });
  },

  attachContentActionEvents: function() {
    // Hide / Publish moderator action handler
    document.querySelectorAll('.btn-hide-image').forEach(btn => {
      btn.onclick = async () => {
        const imgId = btn.dataset.id;
        const isPublic = btn.dataset.status === 'true';
        const newStatus = !isPublic;

        btn.disabled = true;
        try {
          const supabase = await getSupabase();
          const { error } = await supabase
            .from('images')
            .update({ is_public: newStatus })
            .eq('id', imgId);

          if (error) throw error;
          
          const imgObj = this.images.find(img => img.id === imgId);
          await this.logAdminEvent(`Set visibility to ${newStatus ? 'PUBLIC' : 'HIDDEN'} for image: "${imgObj?.title || imgId}"`);

          alert(`Image visibility set to ${newStatus ? 'Public' : 'Hidden'}.`);
          btn.dataset.status = newStatus.toString();
          btn.textContent = newStatus ? 'Hide' : 'Publish';
          
          const badge = document.getElementById(`img-badge-${imgId}`);
          if (badge) {
            badge.textContent = newStatus ? 'PUBLIC' : 'HIDDEN';
            badge.style.color = newStatus ? '#22c55e' : '#fbbf24';
            badge.style.background = newStatus ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)';
          }
        } catch (err) {
          alert("Failed to moderate image visibility: " + err.message);
        } finally {
          btn.disabled = false;
        }
      };
    });
  },

  attachBoardActionEvents: function() {
    // Delete board handler
    document.querySelectorAll('.btn-delete-board').forEach(btn => {
      btn.onclick = async () => {
        const boardId = btn.dataset.id;
        const boardObj = this.boards.find(b => b.id === boardId);
        if (confirm("Are you sure you want to delete this board? This will delete all images assigned to this board as well!")) {
          btn.disabled = true;
          try {
            const supabase = await getSupabase();
            
            // First fetch all images inside this board
            const { data: imgs } = await supabase.from('images').select('*').eq('board_id', boardId);
            if (imgs && imgs.length > 0) {
              const accessToken = await getGoogleDriveToken();
              for (const img of imgs) {
                if (accessToken) {
                  try {
                    await deleteFromDrive(accessToken, img.drive_file_id);
                  } catch (drvErr) {
                    console.warn("Failed to delete related Google Drive file during cascade:", drvErr);
                  }
                }
                if (img.supabase_storage_path) {
                  try {
                    await supabase.storage.from('gallery-backups').remove([img.supabase_storage_path]);
                  } catch (stErr) {
                    console.warn("Failed to delete related Supabase backup during cascade:", stErr);
                  }
                }
              }
              await supabase.from('images').delete().eq('board_id', boardId);
            }
            
            const { error } = await supabase.from('boards').delete().eq('id', boardId);
            if (error) throw error;
            
            await this.logAdminEvent(`Deleted board and cascade deleted images for folder: "${boardObj?.name || boardId}"`);

            alert("Board and all associated images deleted successfully.");
            const row = document.getElementById(`board-row-${boardId}`);
            if (row) row.remove();
          } catch (err) {
            alert("Failed to delete board: " + err.message);
            btn.disabled = false;
          }
        }
      };
    });

    // Trend toggle handler
    document.querySelectorAll('.btn-trend-board').forEach(btn => {
      btn.onclick = async () => {
        const boardId = btn.dataset.id;
        const boardObj = this.boards.find(b => b.id === boardId);
        const isTrending = btn.dataset.status === 'true';
        btn.disabled = true;

        try {
          const supabase = await getSupabase();
          
          let newTrendingList = [...this.trendingBoardIds];
          if (isTrending) {
            newTrendingList = newTrendingList.filter(id => id !== boardId);
          } else {
            if (!newTrendingList.includes(boardId)) {
              newTrendingList.push(boardId);
            }
          }

          const { error } = await supabase
            .from('site_settings')
            .upsert({ key: 'trending_boards', value: JSON.stringify(newTrendingList) });

          if (error) throw error;

          this.trendingBoardIds = newTrendingList;
          const newStatus = !isTrending;
          
          await this.logAdminEvent(`Set board "${boardObj?.name || boardId}" trend status to: ${newStatus ? 'TRENDING' : 'STANDARD'}`);

          alert(`Board trend updated successfully.`);
          btn.dataset.status = newStatus.toString();
          btn.textContent = newStatus ? 'Remove Trend' : 'Make Trend';
          btn.style.color = newStatus ? '#ff3366' : 'var(--text-primary)';
          
          const badge = document.getElementById(`board-trend-badge-${boardId}`);
          if (badge) {
            badge.textContent = newStatus ? 'TRENDING' : 'STANDARD';
            badge.style.color = newStatus ? '#ff3366' : 'var(--text-secondary)';
            badge.style.background = newStatus ? 'rgba(255,51,102,0.1)' : 'var(--hover-bg)';
          }
        } catch (err) {
          alert("Failed to update board trend: " + err.message);
        } finally {
          btn.disabled = false;
        }
      };
    });
  }
};
