export const renderFooter = (siteName = "PinGrid") => {
  return `
    <footer class="site-footer">
      <div class="container footer-container">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="material-icons-outlined" style="color: var(--accent-primary); font-size: 1.2rem;">palette</span>
          <span style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary);">${siteName}</span>
        </div>
        <div class="footer-links">
          <a href="/" onclick="event.preventDefault(); window.appState.navigate('/')">Explore</a>
          <a href="/about" onclick="event.preventDefault(); window.appState.navigate('/about')">About Us</a>
          <a href="/terms" onclick="event.preventDefault(); window.appState.navigate('/terms')">Terms</a>
          <a href="/privacy" onclick="event.preventDefault(); window.appState.navigate('/privacy')">Privacy Policy</a>
        </div>
        <div>
          &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  `;
};
