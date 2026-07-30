export const renderFooter = (siteName = "PinGrid") => {
  return `
    <footer class="site-footer">
      <div class="container footer-container">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="material-icons-outlined" style="color: var(--accent-primary); font-size: 1.2rem;">palette</span>
          <span style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary);">${siteName}</span>
        </div>
        <div class="footer-links">
          <a href="#home">Explore</a>
          <a href="#about" style="pointer-events: none; opacity: 0.5;">About</a>
          <a href="#terms" style="pointer-events: none; opacity: 0.5;">Terms</a>
          <a href="#privacy" style="pointer-events: none; opacity: 0.5;">Privacy</a>
        </div>
        <div>
          &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  `;
};
