import { getSupabase } from '../services/supabase';
import { getGoogleDriveToken } from '../services/api';

export const SettingsView = {
  containerId: 'view-container',
  activeSection: 'general', // 'general' | 'advanced' | 'about'
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
              : (this.activeSection === 'advanced' 
                  ? this.renderAdvancedSection() 
                  : this.renderAboutSection())}
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
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0; font-family: var(--font-heading);">Buy Me a Coffee</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4;">Support the development of PinGrid. Choose your own contribution amount below!</p>
          </div>
        </div>

        <!-- Simulated Payment Interface -->
        <div style="display: flex; flex-direction: column; gap: 16px;" id="donation-container">
          <!-- Quick Amount Selectors -->
          <div>
            <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">Select Amount</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-glass btn-sm amount-chip active" data-amount="3" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">☕ $3 (1 Coffee)</button>
              <button class="btn btn-glass btn-sm amount-chip" data-amount="6" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">☕☕ $6 (2 Coffees)</button>
              <button class="btn btn-glass btn-sm amount-chip" data-amount="15" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">🚀 $15 (Support Pack)</button>
              <button class="btn btn-glass btn-sm amount-chip" data-amount="custom" style="padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; font-size: 0.8rem;">✏️ Custom Amount</button>
            </div>
          </div>

          <!-- Custom Amount input (hidden initially) -->
          <div id="custom-amount-wrapper" style="display: none; flex-direction: column; gap: 6px;">
            <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">Donation Amount ($)</label>
            <input type="number" id="donation-custom-input" class="form-control" value="10" min="1" style="width: 100%; max-width: 200px; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary);">
          </div>

          <!-- Payment Methods selection -->
          <div>
            <label class="form-label" style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px;">Simulated Payment Method</label>
            <div style="display: flex; flex-direction: column; gap: 8px; max-width: 320px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">
                <input type="radio" name="pay-method" value="simulated-card" checked style="accent-color: var(--accent-primary);">
                <span>Simulated Credit Card</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-primary); font-size: 0.85rem;">
                <input type="radio" name="pay-method" value="simulated-qr" style="accent-color: var(--accent-primary);">
                <span>Simulated QR Scanner (UPI)</span>
              </label>
            </div>
          </div>

          <!-- Simulated Credit Card Details Form -->
          <div id="simulated-card-form" style="display: flex; flex-direction: column; gap: 12px; max-width: 400px; border-top: 1px dashed var(--border-color); padding-top: 16px;">
            <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; gap: 6px;">
              <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">Mock Card Number</label>
              <input type="text" id="mock-card-num" class="form-control" placeholder="4111 2222 3333 4444" style="padding: 10px; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" value="4111 2222 3333 4444">
            </div>
            <div style="display: flex; gap: 12px;">
              <div class="form-group" style="flex: 1; margin-bottom: 0; display: flex; flex-direction: column; gap: 6px;">
                <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">Expiry Date</label>
                <input type="text" id="mock-card-expiry" class="form-control" placeholder="MM/YY" style="padding: 10px; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" value="12/29">
              </div>
              <div class="form-group" style="flex: 1; margin-bottom: 0; display: flex; flex-direction: column; gap: 6px;">
                <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);">CVV</label>
                <input type="text" id="mock-card-cvv" class="form-control" placeholder="123" style="padding: 10px; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-secondary); color: var(--text-primary);" value="123">
              </div>
            </div>
          </div>

          <!-- Simulated QR Code Display Form (hidden initially) -->
          <div id="simulated-qr-form" style="display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border-top: 1px dashed var(--border-color); padding-top: 16px; text-align: center;">
            <div style="width: 140px; height: 140px; background: #fff; padding: 10px; border-radius: var(--radius-sm); border: 2px solid var(--text-primary); display: flex; align-items: center; justify-content: center; position: relative;">
              <!-- Simulated QR layout drawing -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; width: 100%; height: 100%;">
                <div style="background: #000; border-radius: 2px;"></div><div style="background: #000; border-radius: 2px;"></div><div style="background: #fff;"></div><div style="background: #000; border-radius: 2px;"></div>
                <div style="background: #fff;"></div><div style="background: #000; border-radius: 2px;"></div><div style="background: #000; border-radius: 2px;"></div><div style="background: #fff;"></div>
                <div style="background: #000; border-radius: 2px;"></div><div style="background: #fff;"></div><div style="background: #000; border-radius: 2px;"></div><div style="background: #000; border-radius: 2px;"></div>
                <div style="background: #000; border-radius: 2px;"></div><div style="background: #000; border-radius: 2px;"></div><div style="background: #fff;"></div><div style="background: #000; border-radius: 2px;"></div>
              </div>
              <span class="material-icons-outlined" style="position: absolute; color: var(--accent-primary); font-size: 2.2rem; background: #fff; padding: 4px; border-radius: 50%;">qr_code_scanner</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Scan QR inside simulator wallet using any mock scanner</div>
          </div>

          <!-- Checkout Action Button -->
          <button id="donation-submit-btn" class="btn btn-primary" style="margin-top: 12px; width: 100%; max-width: 320px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; cursor: pointer;">
            <span class="material-icons-outlined">payment</span>
            <span id="submit-btn-label">Pay $3.00 Securely</span>
          </button>
        </div>
      </div>
    `;
  },

  setupEvents: function() {
    // Nav buttons
    const navGeneral = document.getElementById('settings-nav-general');
    const navAdvanced = document.getElementById('settings-nav-advanced');
    const navAbout = document.getElementById('settings-nav-about');

    if (navGeneral && navAdvanced && navAbout) {
      navGeneral.onclick = () => {
        this.activeSection = 'general';
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
      const submitBtn = document.getElementById('donation-submit-btn');
      const submitLabel = document.getElementById('submit-btn-label');
      const payMethods = document.querySelectorAll('input[name="pay-method"]');
      const cardForm = document.getElementById('simulated-card-form');
      const qrForm = document.getElementById('simulated-qr-form');

      let currentVal = 3;

      const updateSubmitLabel = (val) => {
        if (submitLabel) {
          submitLabel.textContent = `Pay $${parseFloat(val).toFixed(2)} Securely`;
        }
      };

      chips.forEach(chip => {
        chip.onclick = () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const amt = chip.dataset.amount;
          if (amt === 'custom') {
            if (customWrapper) customWrapper.style.display = 'flex';
            currentVal = customInp ? customInp.value : 10;
          } else {
            if (customWrapper) customWrapper.style.display = 'none';
            currentVal = amt;
          }
          updateSubmitLabel(currentVal);
        };
      });

      if (customInp) {
        customInp.oninput = () => {
          currentVal = customInp.value || 0;
          updateSubmitLabel(currentVal);
        };
      }

      payMethods.forEach(method => {
        method.onchange = () => {
          if (method.value === 'simulated-card') {
            if (cardForm) cardForm.style.display = 'flex';
            if (qrForm) qrForm.style.display = 'none';
          } else {
            if (cardForm) cardForm.style.display = 'none';
            if (qrForm) qrForm.style.display = 'flex';
          }
        };
      });

      if (submitBtn) {
        submitBtn.onclick = async () => {
          submitBtn.disabled = true;
          
          // Simulation Step 1
          submitBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">sync</span><span>Connecting simulated gateway...</span>`;
          await new Promise(r => setTimeout(r, 1200));

          // Simulation Step 2
          submitBtn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Authorizing secure mock transfer...</span>`;
          await new Promise(r => setTimeout(r, 1500));

          // Simulation Success
          submitBtn.style.background = '#22c55e';
          submitBtn.innerHTML = `<span class="material-icons-outlined">verified</span><span>Simulated Payment Successful!</span>`;
          
          const donationContainer = document.getElementById('donation-container');
          if (donationContainer) {
            donationContainer.innerHTML = `
              <div class="text-center animate-fade" style="text-align: center; padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 16px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(34,197,94,0.1); border: 2px solid #22c55e; display: flex; align-items: center; justify-content: center; color: #22c55e; font-size: 3.5rem;">
                  <span class="material-icons-outlined" style="font-size: 3.5rem; line-height: 1;">task_alt</span>
                </div>
                <div>
                  <h3 style="font-size: 1.3rem; font-family: var(--font-heading); color: var(--text-primary); margin-bottom: 6px;">Thank You for the Support!</h3>
                  <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 400px; margin: 0 auto; line-height: 1.5;">
                    Your simulated payment of <strong style="color: var(--text-primary); font-weight: 700;">$${parseFloat(currentVal).toFixed(2)}</strong> completed successfully without third-party APIs. Developer features unlocked!
                  </p>
                </div>
                <button class="btn btn-secondary btn-sm" id="donation-done-btn" style="margin-top: 12px; padding: 10px 24px; cursor: pointer;">
                  Support Again
                </button>
              </div>
            `;
            
            const doneBtn = document.getElementById('donation-done-btn');
            if (doneBtn) {
              doneBtn.onclick = () => this.renderContent();
            }
          }
        };
      }
    }
  }
};
