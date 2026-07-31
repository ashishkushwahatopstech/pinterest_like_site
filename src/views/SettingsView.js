import { getSupabase } from '../services/supabase';
import { getGoogleDriveToken } from '../services/api';

export const SettingsView = {
  containerId: 'view-container',
  activeSection: 'general', // 'general' | 'advanced'
  isGdriveConnected: false,

  render: async function() {
    const user = window.appState?.currentUser;
    if (!user) {
      window.appState.navigate('/');
      return;
    }

    if (window.appState.updateSEO) {
      window.appState.updateSEO("Cloud Storage Settings", "Configure your cloud storage connections, toggle secondary backup parameters, and manage Google Drive options.");
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

    container.innerHTML = `
      <div class="container animate-fade" style="padding-top: 40px; max-width: 1000px;">
        <h1 style="font-size: 2rem; font-family: var(--font-heading); margin-bottom: 24px;">Settings</h1>

        <div class="settings-layout">
          <!-- Sidebar Navigation -->
          <nav class="settings-sidebar">
            <button class="settings-nav-btn ${this.activeSection === 'general' ? 'active' : ''}" id="settings-nav-general">
              <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">person</span>
              <span style="vertical-align: middle;">General</span>
            </button>
            <button class="settings-nav-btn ${this.activeSection === 'advanced' ? 'active' : ''}" id="settings-nav-advanced">
              <span class="material-icons-outlined" style="font-size: 1.2rem; vertical-align: middle; margin-right: 8px;">settings_suggest</span>
              <span style="vertical-align: middle;">Advanced</span>
            </button>
          </nav>

          <!-- Content Panel -->
          <div class="settings-content glass">
            ${this.activeSection === 'general' ? this.renderGeneralSection(name, email, avatar) : this.renderAdvancedSection()}
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
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
            <div class="toggle-label-desc" style="line-height: 1.4;">
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

  setupEvents: function() {
    // Nav buttons
    const navGeneral = document.getElementById('settings-nav-general');
    const navAdvanced = document.getElementById('settings-nav-advanced');

    if (navGeneral && navAdvanced) {
      navGeneral.onclick = () => {
        this.activeSection = 'general';
        this.renderContent();
      };
      navAdvanced.onclick = () => {
        this.activeSection = 'advanced';
        this.renderContent();
      };
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
  }
};
