import { renderBreadcrumb } from '../components/Breadcrumb';
import { getSupabase } from '../services/supabase';
import { getGoogleDriveToken } from '../services/api';

export const SettingsView = {
  containerId: 'view-container',
  activeSection: 'general', // 'general' | 'appearance' | 'advanced' | 'about'
  isGdriveConnected: false,

  render: async function() {
    const user = window.appState?.currentUser;
    if (!user) {
      window.appState.navigate('/');
      return;
    }

    // Support tab query parameter (e.g. /settings?tab=channel)
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');
    if (requestedTab) {
      this.activeSection = requestedTab;
    }

    if (window.appState.updateSEO) {
      window.appState.updateSEO("Cloud Storage Settings", "Configure your creator channel handle, cloud storage connections, and appearance parameters.");
    }

    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.isGdriveConnected = false;
    
    // Check connection status
    try {
      const token = await getGoogleDriveToken();
      this.isGdriveConnected = !!token;
    } catch (err) {
      console.error(err);
    }

    this.renderContent();
  },

  renderContent: function() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const user = window.appState.currentUser;
    const name = user.displayName || 'Creator';
    const email = user.email;
    const avatar = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

    const breadcrumbHtml = renderBreadcrumb([
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Settings', icon: 'settings' }
    ]);

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px; max-width: 1000px; padding-bottom: 60px;">
        ${breadcrumbHtml}
        <h1 style="font-size: 2rem; font-family: var(--font-heading); margin-bottom: 24px;">Settings</h1>

        <div class="settings-layout">
          <!-- Sidebar Navigation Wrapper -->
          <div class="settings-sidebar-wrapper">
            <nav class="settings-sidebar">
              <button class="settings-nav-btn ${this.activeSection === 'channel' ? 'active' : ''}" id="settings-nav-channel" style="color: var(--accent-primary); font-weight: 700;">
                <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">campaign</span>
                <span style="vertical-align: middle;">Creator Channel</span>
              </button>
              <button class="settings-nav-btn ${this.activeSection === 'general' ? 'active' : ''}" id="settings-nav-general">
                <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">person</span>
                <span style="vertical-align: middle;">General</span>
              </button>
              <button class="settings-nav-btn ${this.activeSection === 'appearance' ? 'active' : ''}" id="settings-nav-appearance">
                <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">palette</span>
                <span style="vertical-align: middle;">Appearance</span>
              </button>
              <button class="settings-nav-btn ${this.activeSection === 'advanced' ? 'active' : ''}" id="settings-nav-advanced">
                <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">settings_suggest</span>
                <span style="vertical-align: middle;">Advanced</span>
              </button>
              <button class="settings-nav-btn ${this.activeSection === 'about' ? 'active' : ''}" id="settings-nav-about">
                <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">info</span>
                <span style="vertical-align: middle;">About & Support</span>
              </button>
            </nav>
          </div>

          <!-- Content Panel -->
          <div class="settings-content glass">
            ${this.activeSection === 'channel'
              ? this.renderChannelSection()
              : (this.activeSection === 'general' 
                  ? this.renderGeneralSection(name, email, avatar) 
                  : (this.activeSection === 'appearance'
                      ? this.renderAppearanceSection()
                      : (this.activeSection === 'advanced' 
                          ? this.renderAdvancedSection() 
                          : this.renderAboutSection())))}
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  },

  renderChannelSection: function() {
    const profile = window.appState.currentUserProfile || {};
    const isCreator = window.appState.isCreator;
    const currentUsername = profile.username || '';
    const currentChannelName = profile.channel_name || profile.display_name || (window.appState.currentUser?.displayName || '');
    const currentBio = profile.channel_bio || '';

    // Calculate 30-day username change cooldown
    let isCooldownActive = false;
    let daysRemaining = 0;
    if (currentUsername && profile.username_last_changed_at) {
      const lastChanged = new Date(profile.username_last_changed_at);
      const msPassed = new Date() - lastChanged;
      const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
      if (daysPassed < 30) {
        isCooldownActive = true;
        daysRemaining = 30 - daysPassed;
      }
    }

    return `
      <div style="max-width: 100%; box-sizing: border-box; min-width: 0;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 180px;">
            <h2 style="font-size: 1.3rem; font-family: var(--font-heading); margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="material-icons-outlined" style="color: var(--accent-primary);">campaign</span>
              <span>Creator Channel Setup</span>
            </h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
              Set up your unique channel handle and profile details to unlock board creation and image uploads.
            </p>
          </div>
          
          <span class="btn-glass" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-full); font-weight: 700; color: ${isCreator ? '#22c55e' : '#ff3366'}; border: 1px solid ${isCreator ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 51, 102, 0.3)'}; max-width: 100%; word-break: break-word;">
            ${isCreator ? '✅ Creator Channel Active' : '🔒 Channel Required for Uploads'}
          </span>
        </div>

        ${isCreator ? `
          <div style="margin-bottom: 20px; padding: 14px 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; max-width: 100%; box-sizing: border-box;">
            <div style="flex: 1; min-width: 0; max-width: 100%; overflow-wrap: break-word; word-break: break-word;">
              <div style="font-weight: 700; color: #22c55e; font-size: 0.9rem;">Your Public Creator Handle & URL is Live</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; overflow-wrap: anywhere; word-break: break-all;">
                Direct Link: <code style="word-break: break-all; overflow-wrap: anywhere; font-size: 0.75rem; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; max-width: 100%;">${window.location.origin}/u/${currentUsername}</code>
              </div>
            </div>
            <a href="/u/${currentUsername}" class="btn btn-primary btn-sm" style="padding: 8px 16px; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;">
              <span>View Channel</span>
              <span class="material-icons-outlined" style="font-size: 0.9rem; margin-left: 4px;">open_in_new</span>
            </a>
          </div>
        ` : ''}

        ${isCooldownActive ? `
          <div style="margin-bottom: 20px; padding: 12px 16px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); font-size: 0.82rem; color: #fbbf24; display: flex; align-items: center; gap: 10px;">
            <span class="material-icons-outlined" style="font-size: 1.3rem; flex-shrink: 0;">lock_clock</span>
            <div>
              <strong style="color: #fbbf24; font-size: 0.85rem;">Username Cooldown Active:</strong> Your handle <strong>@${currentUsername}</strong> was updated recently. You can change your username again in <strong>${daysRemaining} day(s)</strong>. Usernames can only be changed once every 30 days.
            </div>
          </div>
        ` : ''}

        <form id="creator-channel-form" style="max-width: 100%; box-sizing: border-box;">
          <div class="form-group" style="margin-bottom: 20px; max-width: 100%; box-sizing: border-box;">
            <label class="form-label" for="channel-username-input" style="font-weight: 700; font-size: 0.9rem;">
              Unique Handle / Username <span style="color: #ff3366;">*</span>
            </label>
            <div style="position: relative; width: 100%; box-sizing: border-box;">
              <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--text-muted); user-select: none;">@</span>
              <input type="text" id="channel-username-input" class="form-control" style="padding-left: 32px; width: 100%; box-sizing: border-box; ${isCooldownActive ? 'opacity: 0.7; cursor: not-allowed;' : ''}" placeholder="e.g. ashish_studio" value="${currentUsername}" required maxlength="30" pattern="[a-z0-9_]+" autocomplete="off" ${isCooldownActive ? 'disabled readonly' : ''}>
            </div>
            <div id="username-status-msg" style="font-size: 0.75rem; margin-top: 6px; color: var(--text-secondary); word-break: break-word; overflow-wrap: break-word;">
              ${isCooldownActive 
                ? `<span style="color: #fbbf24; font-weight: 600;">🔒 Username locked for ${daysRemaining} more day(s) (allowed once every 30 days).</span>` 
                : 'Lowercase letters, numbers, and underscores only (3-30 characters). URL: /u/@handle'
              }
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 20px; max-width: 100%; box-sizing: border-box;">
            <label class="form-label" for="channel-name-input" style="font-weight: 700; font-size: 0.9rem;">
              Channel Display Name <span style="color: #ff3366;">*</span>
            </label>
            <input type="text" id="channel-name-input" class="form-control" style="width: 100%; box-sizing: border-box;" placeholder="e.g. Ashish's Creative Studio" value="${currentChannelName}" required maxlength="60" autocomplete="off">
          </div>

          <div class="form-group" style="margin-bottom: 24px; max-width: 100%; box-sizing: border-box;">
            <label class="form-label" for="channel-bio-input" style="font-weight: 700; font-size: 0.9rem;">
              Channel Bio / Description
            </label>
            <textarea id="channel-bio-input" class="form-control" style="width: 100%; box-sizing: border-box;" rows="3" placeholder="Tell visitors about your collections, photography, or digital artwork..." maxlength="300">${currentBio}</textarea>
          </div>

          <button type="submit" id="save-channel-btn" class="btn btn-primary" style="width: 100%; padding: 12px 16px; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box; white-space: normal; text-align: center; word-break: break-word;">
            <span class="material-icons-outlined">${isCreator ? 'save' : 'rocket_launch'}</span>
            <span>${isCreator ? 'Save Channel Changes' : '🚀 Launch Creator Channel & Unlock Uploads'}</span>
          </button>
        </form>
      </div>
    `;
  },

  renderGeneralSection: function(name, email, avatar) {
    return `
      <h2 style="font-size: 1.4rem; margin-bottom: 20px; font-family: var(--font-heading);">Account Profile</h2>
      
      <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 32px; background: rgba(255, 255, 255, 0.02); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <img src="${avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
        <div>
          <div style="font-weight: 700; font-size: 1.1rem;">${name}</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${email}</div>
        </div>
      </div>

      <h2 style="font-size: 1.4rem; margin-bottom: 12px; font-family: var(--font-heading);">Connected Services</h2>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">Manage third-party connections and cloud storage permissions.</p>

      <div class="glass" style="padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span class="material-icons-outlined" style="font-size: 2.5rem; color: #34a853;">add_to_drive</span>
          <div>
            <div style="font-weight: 600; font-size: 0.95rem;">Google Drive Storage</div>
            <div style="font-size: 0.8rem; color: ${this.isGdriveConnected ? '#22c55e' : '#a1a1aa'}; font-weight: 500;">
              ${this.isGdriveConnected ? 'Connected (drive.file scope authorized)' : 'Not Connected'}
            </div>
          </div>
        </div>

        ${this.isGdriveConnected ? `
          <button id="disconnect-gdrive-btn" class="btn btn-danger btn-sm" style="font-size: 0.8rem; padding: 8px 16px;">
            Disconnect
          </button>
        ` : `
          <button id="connect-gdrive-btn" class="btn btn-primary btn-sm" style="font-size: 0.8rem; padding: 8px 16px;">
            Connect Storage
          </button>
        `}
      </div>

      <div style="margin-top: 40px; border-top: 1px solid var(--border-color); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="font-weight: 600; font-size: 0.95rem; color: #f87171;">Delete account</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">This deletes your account record in our database. Your Google Drive files will remain safe.</div>
        </div>
        <button id="delete-account-btn" class="btn btn-danger">Delete Database Account</button>
      </div>
    `;
  },

  renderAppearanceSection: function() {
    const isDark = localStorage.getItem('theme_dark') === 'true';
    const activeAccent = localStorage.getItem('appearance_accent') || 'classic';
    const activeDensity = localStorage.getItem('appearance_density') || 'normal';
    const activeFont = localStorage.getItem('appearance_font') || 'outfit';

    return `
      <h2 style="font-size: 1.4rem; margin-bottom: 12px; font-family: var(--font-heading); color: var(--text-primary);">Appearance Settings</h2>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">Customize how PinGrid looks and feels on your device.</p>

      <!-- Theme Mode -->
      <div style="margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px;">
        <h3 style="font-size: 1rem; margin-bottom: 12px; font-weight: 600; color: var(--text-primary); font-family: var(--font-heading);">Interface Theme</h3>
        <div class="theme-selection-wrapper" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div class="appearance-card ${!isDark ? 'selected' : ''}" id="theme-light-card" style="flex: 1; min-width: 140px; max-width: 200px; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; text-align: center; background: rgba(255,255,255,0.02); transition: var(--transition-fast);">
            <span class="material-icons-outlined" style="font-size: 2.2rem; color: #ff9f43;">light_mode</span>
            <div style="font-weight: 600; font-size: 0.85rem; margin-top: 8px; color: var(--text-primary);">Light Mode</div>
          </div>
          <div class="appearance-card ${isDark ? 'selected' : ''}" id="theme-dark-card" style="flex: 1; min-width: 140px; max-width: 200px; padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; text-align: center; background: rgba(255,255,255,0.02); transition: var(--transition-fast);">
            <span class="material-icons-outlined" style="font-size: 2.2rem; color: #a5b4fc;">dark_mode</span>
            <div style="font-weight: 600; font-size: 0.85rem; margin-top: 8px; color: var(--text-primary);">Dark Mode</div>
          </div>
        </div>
      </div>

      <!-- Custom Accent Colors -->
      <div style="margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px;">
        <h3 style="font-size: 1rem; margin-bottom: 12px; font-weight: 600; color: var(--text-primary); font-family: var(--font-heading);">Accent Theme Color</h3>
        <div class="appearance-accent-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; max-width: 600px; width: 100%;">
          <!-- Classic Pink -->
          <div class="accent-color-card ${activeAccent === 'classic' ? 'selected' : ''}" data-accent="classic" style="padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02);">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #ff3366 0%, #ff6b35 100%);"></div>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">Classic Pink</span>
          </div>
          <!-- Ocean Blue -->
          <div class="accent-color-card ${activeAccent === 'blue' ? 'selected' : ''}" data-accent="blue" style="padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02);">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #0055ff 0%, #00d5ff 100%);"></div>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">Ocean Blue</span>
          </div>
          <!-- Emerald Forest -->
          <div class="accent-color-card ${activeAccent === 'emerald' ? 'selected' : ''}" data-accent="emerald" style="padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02);">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #059669 0%, #34d399 100%);"></div>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">Emerald</span>
          </div>
          <!-- Royal Purple -->
          <div class="accent-color-card ${activeAccent === 'purple' ? 'selected' : ''}" data-accent="purple" style="padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02);">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed 0%, #c084fc 100%);"></div>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">Royal Violet</span>
          </div>
        </div>
      </div>

      <!-- Grid Layout Density -->
      <div style="margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px;">
        <h3 style="font-size: 1rem; margin-bottom: 4px; font-weight: 600; color: var(--text-primary); font-family: var(--font-heading);">Grid Spacing Density</h3>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 12px;">Adjust the layout margins and spacing between images on grids.</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-glass btn-sm density-chip ${activeDensity === 'compact' ? 'active' : ''}" data-density="compact" style="font-size: 0.8rem; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 4px;">
            ${activeDensity === 'compact' ? '<span class="material-icons-outlined" style="font-size: 0.95rem; color: var(--accent-primary);">check</span>' : ''}
            <span>Compact (8px)</span>
          </button>
          <button class="btn btn-glass btn-sm density-chip ${activeDensity === 'normal' ? 'active' : ''}" data-density="normal" style="font-size: 0.8rem; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 4px;">
            ${activeDensity === 'normal' ? '<span class="material-icons-outlined" style="font-size: 0.95rem; color: var(--accent-primary);">check</span>' : ''}
            <span>Standard (16px)</span>
          </button>
          <button class="btn btn-glass btn-sm density-chip ${activeDensity === 'spacious' ? 'active' : ''}" data-density="spacious" style="font-size: 0.8rem; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 4px;">
            ${activeDensity === 'spacious' ? '<span class="material-icons-outlined" style="font-size: 0.95rem; color: var(--accent-primary);">check</span>' : ''}
            <span>Spacious (24px)</span>
          </button>
        </div>
      </div>

      <!-- Font Family Customization -->
      <div>
        <h3 style="font-size: 1rem; margin-bottom: 4px; font-weight: 600; color: var(--text-primary); font-family: var(--font-heading);">Typography Style</h3>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 12px;">Customize the text font family used across layout titles and pages.</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-glass btn-sm font-chip ${activeFont === 'outfit' ? 'active' : ''}" data-font="outfit" style="font-size: 0.8rem; border-radius: var(--radius-sm); font-family: 'Outfit', sans-serif; display: inline-flex; align-items: center; gap: 4px;">
            ${activeFont === 'outfit' ? '<span class="material-icons-outlined" style="font-size: 0.95rem; color: var(--accent-primary);">check</span>' : ''}
            <span>Outfit (Rounded)</span>
          </button>
          <button class="btn btn-glass btn-sm font-chip ${activeFont === 'inter' ? 'active' : ''}" data-font="inter" style="font-size: 0.8rem; border-radius: var(--radius-sm); font-family: 'Inter', sans-serif; display: inline-flex; align-items: center; gap: 4px;">
            ${activeFont === 'inter' ? '<span class="material-icons-outlined" style="font-size: 0.95rem; color: var(--accent-primary);">check</span>' : ''}
            <span>Inter (Clean)</span>
          </button>
          <button class="btn btn-glass btn-sm font-chip ${activeFont === 'playfair' ? 'active' : ''}" data-font="playfair" style="font-size: 0.8rem; border-radius: var(--radius-sm); font-family: 'Playfair Display', serif; display: inline-flex; align-items: center; gap: 4px;">
            ${activeFont === 'playfair' ? '<span class="material-icons-outlined" style="font-size: 0.95rem; color: var(--accent-primary);">check</span>' : ''}
            <span>Playfair (Editorial)</span>
          </button>
        </div>
      </div>
    `;
  },

  renderAdvancedSection: function() {
    const isBackupEnabled = localStorage.getItem('backup_storage_enabled') === 'true';

    return `
      <h2 style="font-size: 1.4rem; margin-bottom: 12px; font-family: var(--font-heading);">Advanced Configuration</h2>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">Buried advanced setting for testing and diagnostics.</p>

      <div class="advanced-toggle-wrapper" style="border-top: none; padding-top: 0; margin-top: 0;">
        <h3 style="font-size: 1rem; margin-bottom: 12px; font-weight: 600;">Storage Options</h3>
        
        <div class="glass" style="padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 0.95rem;">Enable secondary backup storage (experimental)</div>
            <div class="toggle-label-desc" style="line-height: 1.4; color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;">
              If checked, new uploads are automatically mirrored to the platform's private Supabase storage bucket, in addition to your Google Drive. Off by default.
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-backup-storage" ${isBackupEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  },

  renderAboutSection: function() {
    return `
      <h2 style="font-size: 1.4rem; margin-bottom: 12px; font-family: var(--font-heading); color: var(--text-primary);">About PinGrid</h2>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
        PinGrid is a decentralized image storage ecosystem. By separating storage (hosted on your Google Drive) from discovery (moderated registry DB), PinGrid provides a secure, private, and customizable creative portfolio platform.
      </p>

      <!-- Buy Me a Coffee Section -->
      <div class="glass animate-fade" style="padding: 24px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 24px; background: rgba(255,255,255,0.01);">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
          <span class="material-icons-outlined" style="font-size: 3rem; color: #ff9f43; transform: rotate(-10deg); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));">local_cafe</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0; font-family: var(--font-heading);">Buy Me a Coffee (UPI Pay)</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4;">Support the developer directly via UPI. Select or enter your contribution amount below!</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Quick Amount Selectors in INR -->
          <div>
            <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">Select Amount (INR)</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-glass btn-sm amount-chip active" data-amount="100" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">☕ ₹100</button>
              <button class="btn btn-glass btn-sm amount-chip" data-amount="250" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">☕☕ ₹250</button>
              <button class="btn btn-glass btn-sm amount-chip" data-amount="500" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">🚀 ₹500</button>
              <button class="btn btn-glass btn-sm amount-chip" data-amount="custom" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">✏️ Custom</button>
            </div>
          </div>

          <!-- Custom Amount input (hidden initially) -->
          <div id="custom-amount-wrapper" style="display: none; flex-direction: column; gap: 6px;">
            <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">Donation Amount (₹)</label>
            <input type="number" id="donation-custom-input" class="form-control" value="200" min="1" style="width: 100%; max-width: 200px; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary);">
          </div>

          <!-- Interactive QR & Deep Link Container -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; border-top: 1px dashed var(--border-color); padding-top: 20px; text-align: center;">
            <!-- UPI Deep Link Button (Only works on mobile with UPI apps installed) -->
            <a id="upi-deep-link" href="upi://pay?pa=ashishkushwaha88643@okaxis&pn=PinGrid%20Support&am=100&cu=INR" class="btn btn-primary" style="width: 100%; max-width: 320px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 12px; border-radius: var(--radius-md); text-decoration: none; color: #fff;">
              <span class="material-icons-outlined">phone_android</span>
              <span>Pay via UPI App</span>
            </a>

            <!-- Dynamic QR Code (Scannable from Desktop/Mobile) -->
            <div style="background: #ffffff; padding: 16px; border-radius: var(--radius-md); border: 2px solid var(--text-primary); display: inline-block; box-shadow: var(--shadow-md);">
              <img id="upi-qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=ashishkushwaha88643@okaxis%26pn=PinGrid%2520Support%26am=100%26cu=INR" style="width: 180px; height: 180px; display: block;" alt="UPI QR Code">
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Scan with GPay, PhonePe, Paytm, BHIM, or any Banking App</div>
              <div style="font-size: 0.85rem; color: var(--text-primary); font-weight: 700; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>UPI ID:</span>
                <span style="color: var(--accent-primary); letter-spacing: 0.2px;">ashishkushwaha88643@okaxis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupEvents: function() {
    // Nav buttons scroll indicators (Mobile horizontal swipe indicator)
    const sidebar = document.querySelector('.settings-sidebar');
    const sidebarWrapper = document.querySelector('.settings-sidebar-wrapper');
    if (sidebar && sidebarWrapper) {
      const updateIndicators = () => {
        const scrollLeft = sidebar.scrollLeft;
        const maxScroll = sidebar.scrollWidth - sidebar.clientWidth;
        
        if (scrollLeft > 5) {
          sidebarWrapper.classList.add('show-left');
        } else {
          sidebarWrapper.classList.remove('show-left');
        }
        
        if (scrollLeft < maxScroll - 5 && maxScroll > 5) {
          sidebarWrapper.classList.add('show-right');
        } else {
          sidebarWrapper.classList.remove('show-right');
        }
      };

      sidebar.addEventListener('scroll', updateIndicators);
      // Wait for layout calculation to run initial check
      setTimeout(updateIndicators, 100);
      window.addEventListener('resize', updateIndicators);
    }

    // Nav buttons
    const navChannel = document.getElementById('settings-nav-channel');
    const navGeneral = document.getElementById('settings-nav-general');
    const navAppearance = document.getElementById('settings-nav-appearance');
    const navAdvanced = document.getElementById('settings-nav-advanced');
    const navAbout = document.getElementById('settings-nav-about');

    if (navChannel) {
      navChannel.onclick = () => {
        this.activeSection = 'channel';
        this.renderContent();
      };
    }

    if (navGeneral && navAppearance && navAdvanced && navAbout) {
      navGeneral.onclick = () => {
        this.activeSection = 'general';
        this.renderContent();
      };
      navAppearance.onclick = () => {
        this.activeSection = 'appearance';
        this.renderContent();
      };
      navAdvanced.onclick = () => {
        this.activeSection = 'advanced';
        this.renderContent();
      };
      navAbout.onclick = () => {
        this.activeSection = 'about';
        this.renderContent();
      };
    }

    // Creator Channel section handlers
    if (this.activeSection === 'channel') {
      const channelForm = document.getElementById('creator-channel-form');
      const usernameInput = document.getElementById('channel-username-input');
      const statusMsg = document.getElementById('username-status-msg');
      const saveBtn = document.getElementById('save-channel-btn');

      let debounceTimer = null;
      let isUsernameAvailable = false;
      const currentSavedUsername = (window.appState.currentUserProfile?.username || '').toLowerCase();

      const checkUsernameLive = () => {
        if (!usernameInput || !statusMsg || !saveBtn) return;

        const rawVal = usernameInput.value.trim().toLowerCase();
        const cleanVal = rawVal.replace(/[^a-z0-9_]/g, '');

        // Auto-sanitize input field value if user typed invalid chars
        if (usernameInput.value !== cleanVal) {
          usernameInput.value = cleanVal;
        }

        if (debounceTimer) clearTimeout(debounceTimer);

        if (!cleanVal || cleanVal.length < 3) {
          isUsernameAvailable = false;
          saveBtn.disabled = true;
          statusMsg.innerHTML = `
            <span style="color: #ef4444; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
              <span class="material-icons-outlined" style="font-size: 0.95rem;">error_outline</span>
              <span>Handle must be at least 3 characters (lowercase letters, numbers, underscores).</span>
            </span>
          `;
          return;
        }

        if (cleanVal === currentSavedUsername) {
          isUsernameAvailable = true;
          saveBtn.disabled = false;
          statusMsg.innerHTML = `
            <span style="color: #22c55e; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
              <span class="material-icons-outlined" style="font-size: 0.95rem;">check_circle</span>
              <span>@${cleanVal} is your current active handle.</span>
            </span>
          `;
          return;
        }

        // Lock button & show WhatsApp-style checking status indicator
        saveBtn.disabled = true;
        statusMsg.innerHTML = `
          <span style="color: var(--accent-primary); display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
            <span class="material-icons-outlined animate-spin" style="font-size: 0.95rem;">sync</span>
            <span>Checking availability for @${cleanVal}...</span>
          </span>
        `;

        // Debounce database query by 400ms to minimize server load
        debounceTimer = setTimeout(async () => {
          try {
            const supabase = await getSupabase();
            const currentUser = window.appState.currentUser;

            const { data, error } = await supabase
              .from('users')
              .select('id')
              .eq('username', cleanVal)
              .neq('id', currentUser?.uid || '')
              .limit(1);

            if (error) {
              // Database column missing fallback
              isUsernameAvailable = true;
              saveBtn.disabled = false;
              statusMsg.innerHTML = `
                <span style="color: #22c55e; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                  <span class="material-icons-outlined" style="font-size: 0.95rem;">check_circle</span>
                  <span>@${cleanVal} (Ready to save)</span>
                </span>
              `;
              return;
            }

            if (data && data.length > 0) {
              isUsernameAvailable = false;
              saveBtn.disabled = true;
              statusMsg.innerHTML = `
                <span style="color: #ef4444; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                  <span class="material-icons-outlined" style="font-size: 0.95rem;">cancel</span>
                  <span>@${cleanVal} is already taken by another creator.</span>
                </span>
              `;
            } else {
              isUsernameAvailable = true;
              saveBtn.disabled = false;
              statusMsg.innerHTML = `
                <span style="color: #22c55e; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                  <span class="material-icons-outlined" style="font-size: 0.95rem;">check_circle</span>
                  <span>@${cleanVal} is available!</span>
                </span>
              `;
            }
          } catch (err) {
            console.warn("Live handle check warning:", err);
          }
        }, 400);
      };

      if (usernameInput) {
        usernameInput.addEventListener('input', checkUsernameLive);
        // Initial check
        checkUsernameLive();
      }

      if (channelForm) {
        channelForm.onsubmit = async (e) => {
          e.preventDefault();
          const nameInput = document.getElementById('channel-name-input');
          const bioInput = document.getElementById('channel-bio-input');

          const cleanUsername = usernameInput ? usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
          const channelName = nameInput ? nameInput.value.trim() : '';
          const channelBio = bioInput ? bioInput.value.trim() : '';

          if (!isUsernameAvailable) {
            alert("Please enter a valid, available unique handle before submitting.");
            return;
          }

          if (!channelName) {
            alert("Please enter a Channel Display Name.");
            return;
          }

          saveBtn.disabled = true;
          saveBtn.innerHTML = `
            <span class="material-icons-outlined animate-spin">sync</span>
            <span>Saving Creator Channel...</span>
          `;

          try {
            const supabase = await getSupabase();
            const currentUser = window.appState.currentUser;

            const existingUsername = (window.appState.currentUserProfile?.username || '').toLowerCase();
            const isUsernameChanging = cleanUsername !== existingUsername;
            
            const updatePayload = {
              username: cleanUsername,
              channel_name: channelName,
              channel_bio: channelBio,
              is_creator: true
            };

            if (isUsernameChanging || !window.appState.currentUserProfile?.username_last_changed_at) {
              updatePayload.username_last_changed_at = new Date().toISOString();
            }

            // Update user profile in Supabase table
            let updatedUsers = null;
            let updateErr = null;

            const res = await supabase
              .from('users')
              .update(updatePayload)
              .eq('id', currentUser.uid)
              .select();

            updatedUsers = res.data;
            updateErr = res.error;

            if (updateErr && updateErr.message && updateErr.message.includes('username_last_changed_at')) {
              // Retry without username_last_changed_at if column missing on old DB schema
              delete updatePayload.username_last_changed_at;
              const res2 = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', currentUser.uid)
                .select();
              updatedUsers = res2.data;
              updateErr = res2.error;
            }

            if (updateErr) throw updateErr;

            const updatedProfile = updatedUsers?.[0] || null;
            window.appState.currentUserProfile = updatedProfile;
            window.appState.isCreator = true;

            alert(`🎉 Success! Your Creator Channel (@${cleanUsername}) is now active. Collection creation and image uploads are fully unlocked.`);
            
            this.renderContent();
          } catch (err) {
            console.error("Failed to save Creator Channel:", err);
            if (err.message && (err.message.includes('column') || err.message.includes('does not exist'))) {
              alert("⚠️ Supabase SQL Migration Required:\n\nPlease run the following 1-line SQL command in your Supabase Dashboard -> SQL Editor:\n\nALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text UNIQUE, ADD COLUMN IF NOT EXISTS channel_name text, ADD COLUMN IF NOT EXISTS channel_bio text, ADD COLUMN IF NOT EXISTS is_creator boolean DEFAULT false NOT NULL;");
            } else {
              alert("Failed to save Creator Channel: " + err.message);
            }
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
              <span class="material-icons-outlined">rocket_launch</span>
              <span>Launch Creator Channel & Unlock Uploads</span>
            `;
          }
        };
      }
    }

    // General section handlers
    if (this.activeSection === 'general') {
      const disconnectBtn = document.getElementById('disconnect-gdrive-btn');
      const connectBtn = document.getElementById('connect-gdrive-btn');
      const deleteAccBtn = document.getElementById('delete-account-btn');

      if (disconnectBtn) {
        disconnectBtn.onclick = async () => {
          if (confirm("Are you sure you want to disconnect Google Drive? You will not be able to upload files until you reconnect.")) {
            disconnectBtn.disabled = true;
            try {
              const supabase = await getSupabase();
              
              // Delete credentials row from Supabase
              const { error } = await supabase
                .from('user_credentials')
                .delete()
                .eq('user_id', window.appState.currentUser.uid);

              if (error) throw error;

              // Clear tokens
              localStorage.removeItem("drive_access_token");
              localStorage.removeItem("drive_token_expires_at");
              
              alert("Google Drive disconnected successfully.");
              this.isGdriveConnected = false;
              this.renderContent();
            } catch (err) {
              alert("Failed to disconnect: " + err.message);
              disconnectBtn.disabled = false;
            }
          }
        };
      }

      if (connectBtn) {
        connectBtn.onclick = () => {
          if (window.appState && window.appState.triggerGoogleConsent) {
            window.appState.triggerGoogleConsent();
          }
        };
      }

      if (deleteAccBtn) {
        deleteAccBtn.onclick = async () => {
          if (confirm("CRITICAL WARNING: Are you sure you want to delete your database profile? All your boards, upload records, and likes on PinGrid will be deleted immediately. Your Google Drive files will not be touched. This is permanent.")) {
            deleteAccBtn.disabled = true;
            try {
              const supabase = await getSupabase();
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', window.appState.currentUser.uid);

              if (error) throw error;
              
              alert("Account deleted successfully.");
              if (window.appState && window.appState.handleLogout) {
                await window.appState.handleLogout();
              }
            } catch (err) {
              alert("Failed to delete account: " + err.message);
              deleteAccBtn.disabled = false;
            }
          }
        };
      }
    }

    // Appearance section handlers
    if (this.activeSection === 'appearance') {
      const lightCard = document.getElementById('theme-light-card');
      const darkCard = document.getElementById('theme-dark-card');
      const accentCards = document.querySelectorAll('.accent-color-card');
      const densityChips = document.querySelectorAll('.density-chip');
      const fontChips = document.querySelectorAll('.font-chip');

      if (lightCard) {
        lightCard.onclick = () => {
          localStorage.setItem('theme_dark', 'false');
          document.body.classList.remove('dark-theme');
          this.renderContent();
        };
      }

      if (darkCard) {
        darkCard.onclick = () => {
          localStorage.setItem('theme_dark', 'true');
          document.body.classList.add('dark-theme');
          this.renderContent();
        };
      }

      accentCards.forEach(card => {
        card.onclick = () => {
          const acc = card.dataset.accent;
          localStorage.setItem('appearance_accent', acc);
          if (window.appState && window.appState.applyCustomAppearance) {
            window.appState.applyCustomAppearance();
          }
          this.renderContent();
        };
      });

      densityChips.forEach(chip => {
        chip.onclick = () => {
          const dens = chip.dataset.density;
          localStorage.setItem('appearance_density', dens);
          if (window.appState && window.appState.applyCustomAppearance) {
            window.appState.applyCustomAppearance();
          }
          this.renderContent();
        };
      });

      fontChips.forEach(chip => {
        chip.onclick = () => {
          const font = chip.dataset.font;
          localStorage.setItem('appearance_font', font);
          if (window.appState && window.appState.applyCustomAppearance) {
            window.appState.applyCustomAppearance();
          }
          this.renderContent();
        };
      });
    }

    // Advanced section handlers
    if (this.activeSection === 'advanced') {
      const toggleBackup = document.getElementById('toggle-backup-storage');
      if (toggleBackup) {
        toggleBackup.onchange = () => {
          const enabled = toggleBackup.checked;
          localStorage.setItem('backup_storage_enabled', enabled.toString());
          alert(`Secondary backup storage is now ${enabled ? 'enabled' : 'disabled'}.`);
        };
      }
    }

    // About/Support Section Handlers
    if (this.activeSection === 'about') {
      const chips = document.querySelectorAll('.amount-chip');
      const customWrapper = document.getElementById('custom-amount-wrapper');
      const customInp = document.getElementById('donation-custom-input');
      const upiDeepLink = document.getElementById('upi-deep-link');
      const upiQrImage = document.getElementById('upi-qr-image');

      let currentVal = 100;

      const refreshUPILinks = (amount) => {
        const upiUrl = `upi://pay?pa=ashishkushwaha88643@okaxis&pn=PinGrid%20Support&am=${amount}&cu=INR`;
        if (upiDeepLink) {
          upiDeepLink.href = upiUrl;
        }
        if (upiQrImage) {
          const encodedUrl = encodeURIComponent(upiUrl);
          upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodedUrl}`;
        }
      };

      chips.forEach(chip => {
        chip.onclick = () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const amt = chip.dataset.amount;
          if (amt === 'custom') {
            if (customWrapper) customWrapper.style.display = 'flex';
            currentVal = customInp ? customInp.value : 200;
          } else {
            if (customWrapper) customWrapper.style.display = 'none';
            currentVal = amt;
          }
          refreshUPILinks(currentVal);
        };
      });

      if (customInp) {
        customInp.oninput = () => {
          currentVal = customInp.value || 0;
          refreshUPILinks(currentVal);
        };
      }
    }
  }
};
