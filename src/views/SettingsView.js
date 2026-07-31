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
      <div class="container animate-fade" style="padding-top: 40px; max-width: 1000px; padding-bottom: 60px;">
        <h1 style="font-size: 2rem; font-family: var(--font-heading); margin-bottom: 24px;">Settings</h1>

        <div class="settings-layout">
          <!-- Sidebar Navigation -->
          <nav class="settings-sidebar">
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

          <!-- Content Panel -->
          <div class="settings-content glass">
            ${this.activeSection === 'general' 
              ? this.renderGeneralSection(name, email, avatar) 
              : (this.activeSection === 'appearance'
                  ? this.renderAppearanceSection()
                  : (this.activeSection === 'advanced' 
                      ? this.renderAdvancedSection() 
                      : this.renderAboutSection()))}
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
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
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
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; max-width: 600px;">
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
          <button class="btn btn-glass btn-sm density-chip ${activeDensity === 'compact' ? 'active' : ''}" data-density="compact" style="font-size: 0.8rem; border-radius: var(--radius-sm);">Compact (8px)</button>
          <button class="btn btn-glass btn-sm density-chip ${activeDensity === 'normal' ? 'active' : ''}" data-density="normal" style="font-size: 0.8rem; border-radius: var(--radius-sm);">Standard (16px)</button>
          <button class="btn btn-glass btn-sm density-chip ${activeDensity === 'spacious' ? 'active' : ''}" data-density="spacious" style="font-size: 0.8rem; border-radius: var(--radius-sm);">Spacious (24px)</button>
        </div>
      </div>

      <!-- Font Family Customization -->
      <div>
        <h3 style="font-size: 1rem; margin-bottom: 4px; font-weight: 600; color: var(--text-primary); font-family: var(--font-heading);">Typography Style</h3>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 12px;">Customize the text font family used across layout titles and pages.</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-glass btn-sm font-chip ${activeFont === 'outfit' ? 'active' : ''}" data-font="outfit" style="font-size: 0.8rem; border-radius: var(--radius-sm); font-family: 'Outfit', sans-serif;">Outfit (Rounded)</button>
          <button class="btn btn-glass btn-sm font-chip ${activeFont === 'inter' ? 'active' : ''}" data-font="inter" style="font-size: 0.8rem; border-radius: var(--radius-sm); font-family: 'Inter', sans-serif;">Inter (Clean)</button>
          <button class="btn btn-glass btn-sm font-chip ${activeFont === 'playfair' ? 'active' : ''}" data-font="playfair" style="font-size: 0.8rem; border-radius: var(--radius-sm); font-family: 'Playfair Display', serif;">Playfair (Editorial)</button>
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
    // Nav buttons
    const navGeneral = document.getElementById('settings-nav-general');
    const navAppearance = document.getElementById('settings-nav-appearance');
    const navAdvanced = document.getElementById('settings-nav-advanced');
    const navAbout = document.getElementById('settings-nav-about');

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
