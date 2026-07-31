export const renderFooter = (siteName = "PinGrid") => {
  return `
    <footer class="site-footer" style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); padding: 48px 0 24px 0; margin-top: 60px; font-size: 0.9rem; clear: both; position: relative; z-index: 10;">
      <div class="container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; padding-bottom: 32px; border-bottom: 1px solid var(--border-color);">
        <!-- Column 1: Brand Info -->
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span class="material-icons-outlined" style="-webkit-text-fill-color: initial; background: var(--accent-gradient); -webkit-background-clip: text; color: var(--accent-primary); font-size: 1.5rem; font-weight: 800;">palette</span>
            <span style="font-weight: 800; font-family: var(--font-heading); font-size: 1.25rem; color: var(--text-primary);">${siteName}</span>
          </div>
          <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.85rem;">
            A premium, glassmorphic backup registry powered by Google Drive storage edge APIs. Built for photographers and creators.
          </p>
        </div>
        
        <!-- Column 2: Discover Links -->
        <div>
          <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 18px; color: var(--text-primary); font-family: var(--font-heading); font-weight: 700;">Explore</h4>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem;">
            <a href="/" onclick="event.preventDefault(); window.appState.navigate('/')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Public Board Feed</a>
            <a href="/" onclick="event.preventDefault(); window.appState.navigate('/')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Trending Collections</a>
          </div>
        </div>

        <!-- Column 3: Platform Policy -->
        <div>
          <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 18px; color: var(--text-primary); font-family: var(--font-heading); font-weight: 700;">Information</h4>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem;">
            <a href="/about" onclick="event.preventDefault(); window.appState.navigate('/about')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">About Us</a>
            <a href="/terms" onclick="event.preventDefault(); window.appState.navigate('/terms')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Terms of Service</a>
            <a href="/privacy" onclick="event.preventDefault(); window.appState.navigate('/privacy')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Privacy Policy</a>
          </div>
        </div>

        <!-- Column 4: Quick Shortcuts -->
        <div>
          <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 18px; color: var(--text-primary); font-family: var(--font-heading); font-weight: 700;">Platform & Control</h4>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem;">
            <a href="/profile" onclick="event.preventDefault(); window.appState.navigate('/profile')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Creator Profile</a>
            <a href="/settings" onclick="event.preventDefault(); window.appState.navigate('/settings')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Folder Settings</a>
            <a href="/admin" onclick="event.preventDefault(); window.appState.navigate('/admin')" style="color: var(--text-secondary); transition: color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">Admin Panel</a>
          </div>
        </div>
      </div>
      
      <!-- Sub-Copyright Row -->
      <div class="container" style="display: flex; justify-content: space-between; align-items: center; padding-top: 24px; color: var(--text-muted); font-size: 0.8rem; flex-wrap: wrap; gap: 12px;">
        <div>&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</div>
        <div style="display: flex; gap: 16px;">
          <span>Secure Edge API</span>
          <span>Supabase DB Registry</span>
        </div>
      </div>
    </footer>
  `;
};
