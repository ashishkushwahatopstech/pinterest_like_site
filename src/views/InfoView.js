import { renderBreadcrumb } from '../components/Breadcrumb';

export const InfoView = {
  render: async function(params = {}) {
    const type = params.type || 'privacy';
    const container = document.getElementById('view-container');
    if (!container) return;

    // Scroll to top
    window.scrollTo({ top: 0 });

    let title = '';
    let contentHtml = '';

    if (type === 'privacy') {
      title = 'Privacy Policy';
      contentHtml = `
        <p>At PinGrid, accessible from your deployment domains, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by PinGrid and how we use it.</p>
        
        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">Data Collection and Usage</h3>
        <p>We do not run centralized database logging of your private files or personal images. Instead, when you connect your Google account, PinGrid acts as a client-side interface to your personal Google Drive account. We fetch and store ONLY public metadata in our database:</p>
        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li><strong>Boards and Image References</strong>: The names of folders you mark as collection boards, and the Drive file IDs of images you upload or choose to list.</li>
          <li><strong>User Profiles</strong>: Your public Google profile avatar and display name to associate with your boards.</li>
          <li><strong>Client-Side Preferences</strong>: Browser preferences containing top-weighted search tags. This helps us rank your recommended home feed and contextual recommendations entirely on your local browser. We do NOT sync these interest profiles to any server.</li>
        </ul>

        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">Google APIs and Drive Integration</h3>
        <p>PinGrid’s use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" style="color: var(--accent-primary);">Google API Services User Data Policy</a>, including the Limited Use requirements. We utilize read/write scopes strictly to perform backing up of files to folders created on your behalf.</p>

        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">Security and Confidentiality</h3>
        <p>All database accesses are protected by Row-Level Security (RLS) layers inside Supabase. User authentication tokens and API exchange procedures are processed securely. We never disclose, sell, or share account storage keys.</p>

        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">Contact Us</h3>
        <p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact the website administrator.</p>
      `;
    } else if (type === 'terms') {
      title = 'Terms of Service';
      contentHtml = `
        <p>Welcome to PinGrid! These terms and conditions outline the rules and regulations for the use of PinGrid's serverless image gallery backup system.</p>
        
        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">1. Terms of Use</h3>
          <li>You accept that Google Drive serves as the primary host of these files, subject to Google storage quotas.</li>
        </ul>

        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">3. Moderation and User Conduct</h3>
        <p>Administrators of PinGrid reserve the right to review, flag, hide, or remove metadata entries from the public database index for files that violate content regulations, copyright laws, or safety guidelines. If a reference is deleted on PinGrid, your original file on Google Drive remains untouched.</p>

        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">4. Service Disclaimer</h3>
        <p>PinGrid is provided "as is," with all faults, and PinGrid expresses no representations or warranties of any kind related to this website or the materials contained on this website.</p>
      `;
    } else {
      title = 'About Us';
      contentHtml = `
        <p><strong>PinGrid</strong> is a premium, edge-optimized Pinterest-style cloud backup and image sharing platform built to run seamlessly on top of serverless clouds like Cloudflare Pages.</p>
        
        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">How it Works</h3>
        <p>Unlike traditional galleries that require expensive web servers and database storage for images, PinGrid uses a <strong>decentralized cloud storage hybrid model</strong>:</p>
        <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li><strong>Your Google Drive is the Host</strong>: You connect your Google Drive account. When you upload images, they are stored directly inside folders in your Drive account.</li>
          <li><strong>Edge REST Metadata Layer</strong>: We maintain a tiny, fast metadata registry in Supabase to coordinate public feeds, boards, and like counters.</li>
          <li><strong>Behavioral Feeds</strong>: Your feed is dynamically personalized to your tastes using a lightweight client-side recommendation engine, ensuring instant loading speeds and 100% data privacy.</li>
        </ol>

        <h3 style="color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-top: 16px;">Key Features</h3>
        <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
          <li>Instant masonry layouts with high-contrast text rendering.</li>
          <li>Fully responsive design built for both mobile views and wide monitors.</li>
          <li>Google Drive integration with secondary Supabase database backup copies.</li>
          <li>Inline metadata controls for users to manage their backup collections.</li>
        </ul>
      `;
    }

    const breadcrumbHtml = renderBreadcrumb([
      { label: 'Home', url: '/', icon: 'home' },
      { label: title, icon: 'info' }
    ]);

    container.innerHTML = `
      <div class="container animate-fade" style="padding: 40px 16px; max-width: 800px; margin: 0 auto;">
        ${breadcrumbHtml}
        <div class="glass" style="padding: 40px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); background: var(--bg-secondary); box-shadow: var(--shadow-md);">
          <h1 style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 24px; border-bottom: 2px solid var(--border-color); padding-bottom: 12px;">${title}</h1>
          <div class="info-content" style="color: var(--text-secondary); line-height: 1.8; font-size: 0.95rem; display: flex; flex-direction: column; gap: 16px;">
            ${contentHtml}
          </div>
          <div style="margin-top: 32px; border-top: 1px solid var(--border-color); padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-secondary" onclick="window.appState.navigate('/')" style="cursor: pointer;">
              <span class="material-icons-outlined" style="vertical-align: middle; margin-right: 4px;">arrow_back</span>
              <span style="vertical-align: middle;">Back to Home</span>
            </button>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Last Updated: July 2026</span>
          </div>
        </div>
      </div>
    `;
  }
};
