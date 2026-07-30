import { getSupabase, isUserAdmin } from '../services/supabase';
import { renderAdminSkeleton } from '../components/Skeleton';

export const AdminView = {
  containerId: 'view-container',
  users: [],
  images: [],
  stats: {
    totalUsers: 0,
    totalImages: 0,
    totalStorageEst: 0,
  },
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
    // Supabase DB will also reject all requests if they aren't, so this is double-secure.
    const adminCheck = await isUserAdmin();
    if (!adminCheck) {
      container.innerHTML = `
        <div class="container text-center" style="padding: 80px 24px; text-align: center;">
          <span class="material-icons-outlined" style="font-size: 4rem; color: #ef4444; margin-bottom: 16px;">gpp_bad</span>
          <h2 style="font-size: 1.6rem; margin-bottom: 8px;">Access Denied</h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">You must be an administrator to access this page.</p>
          <a href="#home" class="btn btn-primary">Go Home</a>
        </div>
      `;
      return;
    }

    await Promise.all([
      this.fetchStats(),
      this.fetchUsers(),
      this.fetchImages(),
      this.fetchSiteSettings()
    ]);

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

      // Estimate total storage size (Google Drive files plus Supabase backup images)
      const { data: sizes, error: sizeErr } = await supabase
        .from('images')
        .select('id'); // We'll estimate at roughly 1.5MB average size per image uploaded
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

  fetchImages: async function() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('images')
        .select('*, users(*), boards(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.images = data || [];
    } catch (err) {
      console.error("Error fetching admin images:", err);
    }
  },

  fetchSiteSettings: async function() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;
      
      // Populate defaults if settings don't exist in DB
      this.settings = {};
      data?.forEach(s => {
        this.settings[s.key] = s.value;
      });

      if (!('allow_signups' in this.settings)) this.settings.allow_signups = true;
      if (!('site_name' in this.settings)) this.settings.site_name = 'PinGrid';
      if (!('announcement' in this.settings)) this.settings.announcement = '';
    } catch (err) {
      console.error("Error fetching admin settings:", err);
      this.settings = { allow_signups: true, site_name: 'PinGrid', announcement: '' };
    }
  },

  formatBytes: function(bytes) {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  },

  renderContent: function() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px;">
        <h1 style="font-size: 2.2rem; font-family: var(--font-heading); margin-bottom: 24px;">Admin Control Panel</h1>

        <!-- Stats Overview Row -->
        <div class="admin-grid">
          <div class="stat-card glass">
            <span class="stat-label">Total Registered Users</span>
            <span class="stat-val">${this.stats.totalUsers}</span>
          </div>
          <div class="stat-card glass">
            <span class="stat-label">Total Images Uploaded</span>
            <span class="stat-val">${this.stats.totalImages}</span>
          </div>
          <div class="stat-card glass">
            <span class="stat-label">Est. Aggregate Storage</span>
            <span class="stat-val">${this.formatBytes(this.stats.totalStorageEst)}</span>
          </div>
          <div class="stat-card glass">
            <span class="stat-label">Signups Status</span>
            <span class="stat-val" style="color: ${this.settings.allow_signups ? '#22c55e' : '#ef4444'}; font-size: 1.5rem; margin-top: 6px;">
              ${this.settings.allow_signups ? 'ALLOWING SIGNUPS' : 'SIGNUPS DISABLED'}
            </span>
          </div>
        </div>

        <!-- Admin Views Tabs / Layout -->
        <div class="admin-layout">
          <!-- User and Content lists -->
          <div class="glass" style="padding: 28px; border-radius: var(--radius-lg);">
            <div class="tabs-container" style="margin-bottom: 20px;">
              <button class="tab-btn active" id="admin-tab-users">User Directory</button>
              <button class="tab-btn" id="admin-tab-content">Moderation Queue</button>
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
              <div class="admin-table-wrapper">
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
            </div>
          </div>

          <!-- Configuration sidebar -->
          <div class="glass" style="padding: 28px; border-radius: var(--radius-lg); height: fit-content;">
            <h3 style="font-size: 1.2rem; margin-bottom: 20px; font-family: var(--font-heading);">System Config</h3>
            
            <form id="system-config-form">
              <div class="form-group">
                <label class="form-label">Site Name</label>
                <input type="text" id="config-site-name" class="form-control" value="${this.settings.site_name}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Announcement Banner</label>
                <input type="text" id="config-announcement" class="form-control" value="${this.settings.announcement}" placeholder="Banner text (leave empty to hide)">
              </div>

              <div class="form-group toggle-switch-container" style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
                <div>
                  <label class="form-label" style="margin-bottom: 0;">Allow New Registrations</label>
                  <div class="toggle-label-desc">Toggle to disable new signups dynamically.</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="config-allow-signups" ${this.settings.allow_signups ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
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
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
            <div>
              <div style="font-weight: 600;">${u.display_name || 'Creator'}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">${u.email}</div>
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
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-glass btn-sm btn-suspend" data-id="${u.id}" data-status="${u.is_suspended}" style="padding: 4px 10px; font-size: 0.75rem;">
              ${u.is_suspended ? 'Reactivate' : 'Suspend'}
            </button>
            <button class="btn btn-danger btn-sm btn-delete-user" data-id="${u.id}" style="padding: 4px 10px; font-size: 0.75rem;">
              Delete DB
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderContentRows: function(imageList) {
    if (imageList.length === 0) {
      return `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No images uploaded yet.</td></tr>`;
    }

    return imageList.map(img => {
      const thumbUrl = `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
      return `
        <tr id="img-row-${img.id}">
          <td>
            <img src="${thumbUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;" onclick="window.location.hash='#admin?pin=${img.id}'">
          </td>
          <td>
            <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${img.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Board: ${img.boards?.name || 'Unassigned'}</div>
          </td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 500;">${img.users?.display_name || 'Anonymous'}</div>
          </td>
          <td>
            <span id="img-badge-${img.id}" class="btn-glass" style="padding: 2px 6px; font-size: 0.7rem; border-radius: var(--radius-sm); color: ${img.is_public ? '#22c55e' : '#fbbf24'}; background: ${img.is_public ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}">
              ${img.is_public ? 'PUBLIC' : 'HIDDEN'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-glass btn-sm btn-hide-image" data-id="${img.id}" data-status="${img.is_public}" style="padding: 4px 10px; font-size: 0.75rem;">
                ${img.is_public ? 'Hide' : 'Publish'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  setupEvents: function() {
    // Tab controls
    const tabUsers = document.getElementById('admin-tab-users');
    const tabContent = document.getElementById('admin-tab-content');
    const usersPanel = document.getElementById('admin-users-panel');
    const contentPanel = document.getElementById('admin-content-panel');

    if (tabUsers && tabContent && usersPanel && contentPanel) {
      tabUsers.onclick = () => {
        tabUsers.classList.add('active');
        tabContent.classList.remove('active');
        usersPanel.style.display = 'block';
        contentPanel.style.display = 'none';
      };

      tabContent.onclick = () => {
        tabContent.classList.add('active');
        tabUsers.classList.remove('active');
        usersPanel.style.display = 'none';
        contentPanel.style.display = 'block';
      };
    }

    // User Search Input filter
    const userSearchInput = document.getElementById('admin-user-search');
    if (userSearchInput) {
      userSearchInput.oninput = () => {
        const query = userSearchInput.value.toLowerCase();
        const filtered = this.users.filter(u => 
          u.display_name?.toLowerCase().includes(query) || 
          u.email?.toLowerCase().includes(query)
        );
        const rowsContainer = document.getElementById('admin-user-rows');
        if (rowsContainer) {
          rowsContainer.innerHTML = this.renderUserRows(filtered);
          this.attachUserActionEvents();
        }
      };
    }

    this.attachUserActionEvents();
    this.attachContentActionEvents();

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

        try {
          const supabase = await getSupabase();
          
          // Save site_name
          await supabase.from('site_settings').upsert({ key: 'site_name', value: JSON.stringify(siteName) });
          // Save announcement
          await supabase.from('site_settings').upsert({ key: 'announcement', value: JSON.stringify(announcement) });
          // Save allow_signups
          await supabase.from('site_settings').upsert({ key: 'allow_signups', value: JSON.stringify(allowSignups) });

          alert("Configuration saved successfully. Refresh to see branding changes.");
          this.settings = { site_name: siteName, announcement, allow_signups: allowSignups };
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

    // Delete user database records handler
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.onclick = async () => {
        const userId = btn.dataset.id;
        if (confirm("Are you sure you want to delete this user's records from PinGrid database? Google Drive files will not be touched, but all database rows (credentials, boards, images, likes) will cascade delete permanently.")) {
          btn.disabled = true;
          try {
            const supabase = await supabaseCaller();
            const { error } = await supabase
              .from('users')
              .delete()
              .eq('id', userId);

            if (error) throw error;

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
  }
};
