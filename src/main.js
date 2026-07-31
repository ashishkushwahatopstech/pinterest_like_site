// Apply persisted appearance immediately to avoid page load flashing
const applyAppearanceOnBoot = () => {
  const isDark = localStorage.getItem('theme_dark') === 'true';
  document.body.classList.toggle('dark-theme', isDark);

  const accent = localStorage.getItem('appearance_accent') || 'classic';
  const root = document.documentElement;
  if (accent === 'classic') {
    root.style.setProperty('--accent-primary', '#ff3366');
    root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #ff3366 0%, #ff6b35 100%)');
  } else if (accent === 'blue') {
    root.style.setProperty('--accent-primary', '#0055ff');
    root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #0055ff 0%, #00d5ff 100%)');
  } else if (accent === 'emerald') {
    root.style.setProperty('--accent-primary', '#10b981');
    root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #059669 0%, #34d399 100%)');
  } else if (accent === 'purple') {
    root.style.setProperty('--accent-primary', '#8b5cf6');
    root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)');
  }

  const density = localStorage.getItem('appearance_density') || 'normal';
  if (density === 'compact') {
    root.style.setProperty('--grid-gap', '8px');
  } else if (density === 'spacious') {
    root.style.setProperty('--grid-gap', '24px');
  } else {
    root.style.setProperty('--grid-gap', '16px');
  }

  const font = localStorage.getItem('appearance_font') || 'outfit';
  if (font === 'inter') {
    root.style.setProperty('--font-heading', "'Inter', sans-serif");
    root.style.setProperty('--font-body', "'Inter', sans-serif");
  } else if (font === 'playfair') {
    root.style.setProperty('--font-heading', "'Playfair Display', serif");
    root.style.setProperty('--font-body', "'Playfair Display', serif");
  } else {
    root.style.setProperty('--font-heading', "'Outfit', sans-serif");
    root.style.setProperty('--font-body', "'Outfit', sans-serif");
  }
};
applyAppearanceOnBoot();

import './index.css';
import { subscribeToAuth, loginWithGoogle, logout } from './services/auth';
import { getSupabase, supabasePublic, isUserAdmin } from './services/supabase';
import { getGoogleDriveToken, connectGoogleDrive } from './services/api';
import { getRootFolder, getOrCreateBoardFolder, uploadFileToDrive, makeFilePublic, deleteFromDrive } from './services/drive';
import { trackUserSearch, trackUserView, trackUserLike, getRelatedRecommendations } from './services/recommendations';

// Views
import { HomeView } from './views/HomeView';
import { BoardView } from './views/BoardView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { SettingsView } from './views/SettingsView';
import { InfoView } from './views/InfoView';

// Components
import { renderHeader, setupHeaderEvents } from './components/Header';
import { renderFooter } from './components/Footer';
import { renderModalsHtml, showConnectModal, showCreateBoardModal, showUploadModal } from './components/Modals';
import { renderLightbox, setupLightboxEvents } from './components/Lightbox';
import { renderMasonryGrid, setupGridEvents } from './components/MasonryGrid';

// Global application state
window.appState = {
  currentUser: null,
  isAdmin: false,
  siteSettings: {
    site_name: 'PinGrid',
    allow_signups: true,
    announcement: ''
  },
  googleCodeClient: null,
  applyCustomAppearance: applyAppearanceOnBoot,
  
  navigate: (path, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    route();
  },
  
  // Expose triggers
  showCreateBoard: () => {
    showCreateBoardModal(async (name, isPublic) => {
      const supabase = await getSupabase();
      const accessToken = await getGoogleDriveToken();
      const isBackupEnabled = localStorage.getItem('backup_storage_enabled') === 'true';

      if (!accessToken && !isBackupEnabled) {
        throw new Error("Google Drive storage is disconnected. Please connect Google Drive, or enable secondary backup storage in Settings.");
      }

      let driveFolderId = 'supabase_only';
      if (accessToken) {
        // 1. Create folder in Google Drive first
        const rootFolderId = await getRootFolder(accessToken);
        driveFolderId = await getOrCreateBoardFolder(accessToken, rootFolderId, name);
      }

      // 2. Insert board into Supabase
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: window.appState.currentUser.uid,
          name,
          drive_folder_id: driveFolderId,
          is_public: isPublic
        })
        .select();

      if (error) throw error;
      
      alert(`Board "${name}" created successfully.`);
      // Refresh current view (profile or upload board list)
      const hash = window.location.hash;
      if (hash.startsWith('#profile')) {
        await ProfileView.render();
      } else if (hash.startsWith('#board')) {
        const boardId = hash.split('/')[1];
        await BoardView.render({ id: boardId });
      }
    });
  },

  showUpload: (preselectedBoardId = null) => {
    // Fetch user boards
    getSupabase().then(async (supabase) => {
      const { data: boards, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', window.appState.currentUser.uid)
        .order('name');
        
      if (error) {
        alert("Failed to load boards: " + error.message);
        return;
      }

      showUploadModal(
        boards,
        async (boardId, file, title, description, progressCallback) => {
          const supabase = await getSupabase(); // Get fresh authenticated client
          const accessToken = await getGoogleDriveToken();
          const isBackupEnabled = localStorage.getItem('backup_storage_enabled') === 'true';
          
          if (!accessToken && !isBackupEnabled) {
            throw new Error("No storage connected. Please connect Google Drive, or enable secondary backup storage in Settings.");
          }

          // Find active board
          const activeBoard = boards.find(b => b.id === boardId);
          if (!activeBoard) throw new Error("Board not found.");

          let driveFileId = 'supabase_only';
          let driveViewLink = '';
          let driveDownloadLink = '';

          if (accessToken) {
            let driveFolderId = activeBoard.drive_folder_id;
            
            // Auto-create board folder in Google Drive if it was created as Supabase-only
            if (driveFolderId === 'supabase_only') {
              try {
                const rootFolderId = await getRootFolder(accessToken);
                driveFolderId = await getOrCreateBoardFolder(accessToken, rootFolderId, activeBoard.name);
                
                // Update board record in Supabase
                await supabase
                  .from('boards')
                  .update({ drive_folder_id: driveFolderId })
                  .eq('id', activeBoard.id);
                  
                activeBoard.drive_folder_id = driveFolderId;
              } catch (folderErr) {
                console.error("Auto-creation of Google Drive folder failed:", folderErr);
              }
            }

            if (driveFolderId !== 'supabase_only') {
              // 1. Upload to Google Drive
              const driveFile = await uploadFileToDrive(accessToken, driveFolderId, file, title, description, progressCallback);
              
              // 2. Set file permissions on Google Drive to public read
              await makeFilePublic(accessToken, driveFile.id);
              
              driveFileId = driveFile.id;
              driveViewLink = `https://lh3.googleusercontent.com/d/${driveFile.id}`;
              driveDownloadLink = `https://drive.google.com/uc?export=download&id=${driveFile.id}`;
            } else {
              progressCallback(30);
            }
          } else {
            // Display static upload progress while loading onto Supabase
            progressCallback(30);
          }

          // 3. (Optional or Mandatory if Drive is disconnected) Upload to Supabase Storage
          let supabasePath = null;
          if (isBackupEnabled) {
            try {
              // Convent path: siteName/{firebase_uid}/{board}/{filename}
              const fileExt = file.name.split('.').pop();
              const filename = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
              const path = `${window.appState.siteSettings.site_name}/${window.appState.currentUser.uid}/${activeBoard.name}/${filename}`;
              
              if (!accessToken) progressCallback(60);

              const { data: storageData, error: storageErr } = await supabase.storage
                .from('gallery-backups')
                .upload(path, file, { cacheControl: '3600', upsert: true });

              if (storageErr) throw storageErr;
              supabasePath = path;

              // Generate public URL if this is the only storage
              const { data: publicUrlData } = supabase.storage.from('gallery-backups').getPublicUrl(path);
              if (!accessToken) {
                driveViewLink = publicUrlData.publicUrl;
                driveDownloadLink = publicUrlData.publicUrl;
                progressCallback(100);
              }
            } catch (backupErr) {
              console.error("Supabase Storage backup failed:", backupErr);
              if (!accessToken) throw backupErr; // Crash upload only if GDrive is disconnected
            }
          }

          // 4. Save metadata to Supabase images table
          const { error: dbErr } = await supabase
            .from('images')
            .insert({
              user_id: window.appState.currentUser.uid,
              board_id: boardId,
              title,
              description,
              drive_file_id: driveFileId,
              drive_view_link: driveViewLink,
              drive_download_link: driveDownloadLink,
              supabase_storage_path: supabasePath,
              is_public: activeBoard.is_public
            });

          if (dbErr) throw dbErr;

          // Reload current view
          const currentHash = window.location.hash;
          if (currentHash.startsWith('#board/')) {
            const currentBoardId = currentHash.split('/')[1].split('?')[0];
            if (currentBoardId === boardId) {
              await BoardView.render({ id: boardId });
            }
          } else if (currentHash.startsWith('#profile')) {
            await ProfileView.render();
          }
        },
        () => {
          // Trigger Create Board
          window.appState.showCreateBoard();
        }
      );

      // Pre-select board if provided
      if (preselectedBoardId) {
        const select = document.getElementById('upload-board-select');
        if (select) select.value = preselectedBoardId;
      }
    });
  },

  toggleLike: async (pinId, likeBtn) => {
    const user = window.appState.currentUser;
    if (!user) {
      alert("Sign in with Google to like images.");
      return;
    }

    try {
      const supabase = await getSupabase();
      
      // Check if liked
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.uid)
        .eq('image_id', pinId);

      if (error) throw error;
      const alreadyLiked = data.length > 0;

      let response;
      if (alreadyLiked) {
        // Unlike
        const { error: unlikeErr } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.uid)
          .eq('image_id', pinId);
          
        if (unlikeErr) throw unlikeErr;
        
        response = await supabase.rpc('decrement_likes', { image_uuid: pinId });
      } else {
        // Like
        const { error: likeErr } = await supabase
          .from('likes')
          .insert({ user_id: user.uid, image_id: pinId });
          
        if (likeErr) throw likeErr;
        
        response = await supabase.rpc('increment_likes', { image_uuid: pinId });

        // Track like interest
        try {
          const { data: img } = await supabase
            .from('images')
            .select('title, description, boards(name)')
            .eq('id', pinId)
            .single();
          if (img) {
            trackUserLike({
              title: img.title,
              description: img.description,
              boards: img.boards
            });
          }
        } catch (trackErr) {
          console.warn("Failed to track interest for like:", trackErr);
        }
      }

      const updatedCount = response.data?.likes_count ?? 0;
      
      // Update UI of like button
      if (likeBtn) {
        const label = likeBtn.querySelector('.likes-count-label');
        const icon = likeBtn.querySelector('.material-icons-outlined');
        if (label) label.textContent = updatedCount;
        
        if (alreadyLiked) {
          likeBtn.classList.remove('btn-primary');
          likeBtn.classList.add('btn-secondary');
          if (icon) icon.style.color = '';
        } else {
          likeBtn.classList.remove('btn-secondary');
          likeBtn.classList.add('btn-primary');
          if (icon) icon.style.color = '#fff';
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to toggle favorite: " + err.message);
    }
  },

  triggerGoogleConsent: () => {
    if (window.appState.googleCodeClient) {
      window.appState.googleCodeClient.requestCode();
    } else {
      alert("Google Identity Services client is still loading. Please try again.");
    }
  },

  handleLogout: async () => {
    await logout();
    window.location.hash = 'home';
  }
};

// --- INITIALIZE GOOGLE IDENTITY SERVICES OAUTH CLIENT ---
const initGoogleOAuthClient = () => {
  if (typeof google === 'undefined') {
    setTimeout(initGoogleOAuthClient, 500);
    return;
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn("VITE_GOOGLE_CLIENT_ID missing in env parameters.");
    return;
  }

  window.appState.googleCodeClient = google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file',
    ux_mode: 'popup',
    callback: async (response) => {
      if (response.code) {
        try {
          // Disable consent action buttons
          const btn = document.getElementById('consent-connect-btn') || document.getElementById('connect-gdrive-btn');
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons-outlined" style="animation: loading 1s infinite;">hourglass_empty</span><span>Connecting...</span>`;
          }

          // Exchange auth code in the Cloudflare Worker
          const redirectUri = window.location.origin;
          await connectGoogleDrive(response.code, redirectUri);
          
          alert("Successfully connected Google Drive! Creating application directories...");
          
          // Pre-initialize root folder on Google Drive
          const token = await getGoogleDriveToken();
          if (token) {
            await getRootFolder(token);
          }

          window.location.reload();
        } catch (err) {
          alert("Connection failed: " + err.message);
          window.location.reload();
        }
      }
    }
  });
};

// --- DEEP LINKED LIGHTBOX OVERLAY ---
const openLightboxOverlay = async (imageId) => {
  const wrapper = document.getElementById('lightbox-wrapper');
  if (!wrapper) return;

  try {
    const { data, error } = await supabasePublic
      .from('images')
      .select('*, users!images_user_id_fkey(*), boards(*)')
      .eq('id', imageId)
      .single();

    if (error || !data) return;

    // Track view interest
    trackUserView(data);

    wrapper.innerHTML = renderLightbox(data, window.appState.currentUser, window.appState.isAdmin);
    
    setupLightboxEvents(data, window.appState.currentUser, window.appState.isAdmin, {
      onLike: async (pinId, likeBtn) => {
        await window.appState.toggleLike(pinId, likeBtn);
      },
      onDelete: async (img) => {
        const supabase = await getSupabase();
        const accessToken = await getGoogleDriveToken();
        
        if (accessToken) {
          // Delete from Google Drive
          await deleteFromDrive(accessToken, img.drive_file_id);
        }

        // Delete backup from Supabase Storage if it exists
        if (img.supabase_storage_path) {
          try {
            await supabase.storage.from('gallery-backups').remove([img.supabase_storage_path]);
          } catch (stErr) {
            console.error("Failed to delete Supabase backup image:", stErr);
          }
        }

        // Delete DB record
        const { error: dbErr } = await supabase.from('images').delete().eq('id', img.id);
        if (dbErr) throw dbErr;

        alert("Image deleted successfully.");
      },
      onHide: async (imgId, isPublic) => {
        const supabase = await getSupabase();
        const { error } = await supabase
          .from('images')
          .update({ is_public: isPublic })
          .eq('id', imgId);

        if (error) throw error;
        alert(`Image visibility updated.`);
      },
      onSave: async (imgId, newTitle, newDesc) => {
        const supabase = await getSupabase();
        const { error } = await supabase
          .from('images')
          .update({ title: newTitle, description: newDesc })
          .eq('id', imgId);
          
        if (error) throw error;
        
        // Update URL to match new title slug!
        const cleanTitle = window.appState.slugify(newTitle);
        window.history.replaceState({}, '', `/pin/${cleanTitle}--${imgId}`);
        
        // Update background card UI titles
        const cardTitleEl = document.querySelector(`.pin-card[data-id="${imgId}"] h4, [data-id="${imgId}"] .pin-bottom-info h4`);
        if (cardTitleEl) cardTitleEl.textContent = newTitle;
      }
    });

    // Fetch related images asynchronously
    (async () => {
      try {
        let relatedQuery = supabasePublic
          .from('images')
          .select('*, users!images_user_id_fkey(*), boards(*)')
          .eq('is_public', true)
          .neq('id', imageId);

        if (data.board_id) {
          relatedQuery = relatedQuery.eq('board_id', data.board_id);
        }

        relatedQuery = relatedQuery.limit(8);
        let { data: relatedImages } = await relatedQuery;

        const relatedCount = relatedImages ? relatedImages.length : 0;
        if (relatedCount < 8) {
          let fallbackQuery = supabasePublic
            .from('images')
            .select('*, users!images_user_id_fkey(*), boards(*)')
            .eq('is_public', true)
            .neq('id', imageId)
            .order('created_at', { ascending: false });

          let { data: fallbackImages } = await fallbackQuery;

          if (fallbackImages) {
            const relatedIds = (relatedImages || []).map(r => r.id);
            const filteredFallback = fallbackImages.filter(f => !relatedIds.includes(f.id));
            const needed = 8 - relatedCount;
            relatedImages = [...(relatedImages || []), ...filteredFallback.slice(0, needed)];
          }
        }

        if (relatedImages && relatedImages.length > 0) {
          // Sort related images based on content similarity and user interests
          relatedImages = getRelatedRecommendations(data, relatedImages);

          const relatedSection = document.getElementById('lightbox-related-section');
          const relatedGridContainer = document.getElementById('lightbox-related-grid-container');
          
          if (relatedSection && relatedGridContainer) {
            relatedGridContainer.innerHTML = renderMasonryGrid(relatedImages, false, 'gallery-masonry-grid-related');
            relatedSection.style.display = 'block';

            const relatedGridEl = document.getElementById('gallery-masonry-grid-related');
            if (relatedGridEl) {
              setupGridEvents(
                relatedGridEl,
                (pinId) => {
                  const imgObj = relatedImages.find(img => img.id === pinId);
                  const slug = imgObj ? window.appState.slugify(imgObj.title) : 'pin';
                  window.appState.navigate(`/pin/${slug}--${pinId}`);

                  // Scroll to top of the lightbox modal cleanly
                  const modal = document.getElementById('lightbox-modal');
                  if (modal) modal.scrollTo({ top: 0, behavior: 'smooth' });
                },
                async (pinId, likeBtn) => {
                  await window.appState.toggleLike(pinId, likeBtn);
                }
              );
            }
          }
        }
      } catch (rErr) {
        console.warn("Failed to load related images:", rErr);
      }
    })();

  } catch (err) {
    console.error("Error opening lightbox:", err);
  }
};

// --- STATIC PAGE BRANDING & BANNER LOADERS ---
const loadBrandingSettings = async () => {
  try {
    const { data } = await supabasePublic.from('site_settings').select('*');
    data?.forEach(s => {
      window.appState.siteSettings[s.key] = s.value;
    });
  } catch (err) {
    console.warn("Could not load branding settings, using defaults.", err);
  }

  // Update branding across elements
  const siteName = window.appState.siteSettings.site_name;
  
  // Update browser document title
  document.title = `${siteName} - Premium Pinterest-style Image Gallery`;
  
  // Render footer
  const footerWrapper = document.getElementById('footer-wrapper');
  if (footerWrapper) {
    footerWrapper.innerHTML = renderFooter(siteName);
  }

  // Display announcement banner if present
  const bannerWrapper = document.getElementById('announcement-banner-wrapper');
  const annText = window.appState.siteSettings.announcement;
  if (bannerWrapper) {
    if (annText) {
      bannerWrapper.innerHTML = `
        <div class="announcement-banner">
          <span>${annText}</span>
        </div>
      `;
      bannerWrapper.style.display = 'block';
    } else {
      bannerWrapper.style.display = 'none';
    }
  }
};

// --- DRAWER CONTROLS ---
const setupDrawerNav = () => {
  const drawer = document.getElementById('sidebar-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close-btn');

  const closeDrawer = () => {
    if (drawer && drawerBackdrop) {
      drawer.classList.remove('show');
      drawerBackdrop.classList.remove('show');
    }
  };

  if (closeBtn) closeBtn.onclick = closeDrawer;
  if (drawerBackdrop) drawerBackdrop.onclick = closeDrawer;

  // Drawer links closing behavior
  drawer?.querySelectorAll('.drawer-link').forEach(link => {
    link.onclick = closeDrawer;
  });
};

const updateDrawerNav = (activePath) => {
  const drawer = document.getElementById('sidebar-drawer');
  if (!drawer) return;

  drawer.querySelectorAll('.drawer-link').forEach(link => link.classList.remove('active'));

  let activeId = 'drawer-link-home';
  if (activePath.startsWith('profile')) activeId = 'drawer-link-profile';
  else if (activePath.startsWith('settings')) activeId = 'drawer-link-settings';
  else if (activePath.startsWith('admin')) activeId = 'drawer-link-admin';

  const activeLink = document.getElementById(activeId);
  if (activeLink) activeLink.classList.add('active');
};

const updateDrawerHTML = (user, isAdmin) => {
  const drawer = document.getElementById('sidebar-drawer');
  if (!drawer) return;

  drawer.innerHTML = `
    <div class="drawer-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-family: var(--font-heading); font-size: 1.15rem; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        <span class="material-icons-outlined" style="-webkit-text-fill-color: initial; color: var(--accent-primary);">palette</span>
        <span>PinGrid Menu</span>
      </div>
      <button id="drawer-close-btn" style="cursor: pointer; color: var(--text-secondary); background: none; border: none;">
        <span class="material-icons-outlined">close</span>
      </button>
    </div>

    <!-- Mobile User Card (Only shown inside drawer on mobile) -->
    ${user ? `
      <div class="mobile-drawer-profile" style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02);">
        <img src="${user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">
        <div style="overflow: hidden;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.displayName || 'Creator'}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${user.email}</div>
        </div>
      </div>
    ` : `
      <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
        <button id="drawer-login-btn" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span class="material-icons-outlined">login</span>
          <span>Sign In with Google</span>
        </button>
      </div>
    `}

    <nav class="drawer-nav" style="padding: 16px 12px; display: flex; flex-direction: column; gap: 4px;">
      <a href="/" class="drawer-link" id="drawer-link-home" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); font-weight: 500; font-size: 0.9rem; color: var(--text-primary); transition: background 0.2s;">
        <span class="material-icons-outlined">explore</span>
        <span>Explore Gallery</span>
      </a>
      ${user ? `
        <a href="/profile" class="drawer-link" id="drawer-link-profile" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); font-weight: 500; font-size: 0.9rem; color: var(--text-primary); transition: background 0.2s;">
          <span class="material-icons-outlined">person</span>
          <span>My Profile</span>
        </a>
        <a href="/settings" class="drawer-link" id="drawer-link-settings" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); font-weight: 500; font-size: 0.9rem; color: var(--text-primary); transition: background 0.2s;">
          <span class="material-icons-outlined">settings</span>
          <span>Settings</span>
        </a>
        ${isAdmin ? `
          <a href="/admin" class="drawer-link" id="drawer-link-admin" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); font-weight: 500; font-size: 0.9rem; color: var(--accent-primary); transition: background 0.2s;">
            <span class="material-icons-outlined">admin_panel_settings</span>
            <span>Admin Panel</span>
          </a>
        ` : ''}
      ` : ''}
    </nav>

    ${user ? `
      <div style="margin-top: auto; padding: 16px 12px; border-top: 1px solid var(--border-color);">
        <button id="drawer-logout-btn" class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; color: #f87171; border-color: rgba(248,113,113,0.2); cursor: pointer;">
          <span class="material-icons-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    ` : `
      <div style="margin-top: auto; padding: 16px 20px; font-size: 0.75rem; color: var(--text-muted); text-align: center; border-top: 1px solid var(--border-color);">
        PinGrid Serverless Site
      </div>
    `}
  `;

  // Bind events
  setupDrawerNav();

  // Bind logout click
  const drawerLogout = document.getElementById('drawer-logout-btn');
  if (drawerLogout) {
    drawerLogout.onclick = async () => {
      try {
        const closeBtn = document.getElementById('drawer-close-btn');
        if (closeBtn) closeBtn.click();
        await logout();
      } catch (err) {
        alert("Logout failed: " + err.message);
      }
    };
  }

  // Bind login click
  const drawerLogin = document.getElementById('drawer-login-btn');
  if (drawerLogin) {
    drawerLogin.onclick = async () => {
      try {
        const closeBtn = document.getElementById('drawer-close-btn');
        if (closeBtn) closeBtn.click();
        await loginWithGoogle();
      } catch (err) {
        console.error("Login error:", err);
      }
    };
  }

  updateDrawerNav(parseUrl().path);
};

// --- APPLICATION ROUTING ENGINES ---
const parseUrl = () => {
  const path = window.location.pathname;
  const queryString = window.location.search;
  
  const query = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [key, val] of params.entries()) {
      query[key] = val;
    }
  }

  let cleanPath = path.replace(/^\/+|\/+$/g, '');
  if (cleanPath === '') cleanPath = 'home';
  return { path: cleanPath, query };
};

// --- SEO METADATA UPDATER ---
const updateSEOMetadata = (title, description) => {
  const siteName = window.appState.siteSettings.site_name || 'PinGrid';
  document.title = `${title} | ${siteName}`;
  
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = description;
  
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.content = `${title} | ${siteName}`;

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.content = description;
};
// --- SEO-FRIENDLY URL SLUG GENERATOR ---
const slugify = (text) => {
  if (!text) return 'untitled';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric, hyphens, and spaces
    .replace(/\s+/g, '-')     // replace spaces with single hyphens
    .replace(/-+/g, '-')      // replace multiple hyphens with single hyphen
    .trim();
};
window.appState.slugify = slugify;
window.appState.updateSEO = updateSEOMetadata;

async function route() {
  const { path, query } = parseUrl();
  
  // Close drawer nav
  updateDrawerNav(path);

  // Extract ID from slugified URL structures (e.g. /pin/title--UUID or /board/name--UUID)
  let activePinId = query.pin || null;

  if (path.startsWith('pin/')) {
    const pinSlug = path.split('/')[1];
    if (pinSlug && pinSlug.includes('--')) {
      activePinId = pinSlug.split('--')[1];
    }
  }

  // Re-render header to reflect the active page and route state
  const headerWrapper = document.getElementById('header-wrapper');
  if (headerWrapper) {
    headerWrapper.innerHTML = renderHeader(window.appState.currentUser, window.appState.isAdmin, path);
    setupHeaderEvents(window.appState.currentUser, (searchQuery) => {
      HomeView.handleGlobalSearch(searchQuery);
    });
    
    // Re-bind header upload click
    const uploadBtn = document.getElementById('header-upload-btn');
    if (uploadBtn) {
      uploadBtn.onclick = () => {
        window.appState.showUpload();
      };
    }
    // Re-bind header sign in button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.onclick = async () => {
        try {
          await loginWithGoogle();
        } catch (err) {
          console.error("Google Authentication error:", err);
        }
      };
    }
  }

  // Router views
  if (path.startsWith('home') || path === '' || path.startsWith('pin/')) {
    if (query.q) {
      trackUserSearch(query.q);
    }
    await HomeView.render({ boardId: query.boardId, q: query.q });
  } else if (path.startsWith('board/')) {
    const boardSlug = path.split('/')[1];
    const boardId = boardSlug.includes('--') ? boardSlug.split('--')[1] : boardSlug;
    await BoardView.render({ id: boardId });
  } else if (path === 'profile') {
    await ProfileView.render();
  } else if (path === 'settings') {
    await SettingsView.render();
  } else if (path === 'admin') {
    await AdminView.render();
  } else if (path === 'privacy') {
    await InfoView.render({ type: 'privacy' });
  } else if (path === 'terms') {
    await InfoView.render({ type: 'terms' });
  } else if (path === 'about') {
    await InfoView.render({ type: 'about' });
  } else {
    window.appState.navigate('/', true);
  }

  // Handle lightbox detail parameter
  if (activePinId) {
    await openLightboxOverlay(activePinId);
  } else {
    const wrapper = document.getElementById('lightbox-wrapper');
    if (wrapper) wrapper.innerHTML = '';
  }
}

// --- APPLICATION INITIALIZATION ---
const initApp = async () => {
  // 1. Load settings and banner first
  await loadBrandingSettings();

  // 1b. Apply appearance customization before paint to avoid flashes!
  window.appState.applyCustomAppearance();

  // 1c. Bind global scroll listener once for the sticky header styles
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  // 2. Setup drawer events
  setupDrawerNav();

  // 3. Subscribe to auth changes
  subscribeToAuth(async (user) => {
    window.appState.currentUser = user;
    window.appState.isAdmin = false;
    updateDrawerHTML(user, false);

    // Show header in loading state
    const headerWrapper = document.getElementById('header-wrapper');
    const modalsWrapper = document.getElementById('modals-wrapper');
    
    if (headerWrapper) {
      headerWrapper.innerHTML = renderHeader(user, false, parseUrl().path);
    }
    if (modalsWrapper) {
      modalsWrapper.innerHTML = renderModalsHtml();
    }

    if (user) {
      // Sync or register user profile in Supabase table
      try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: user.uid,
            display_name: user.displayName,
            email: user.email,
            avatar_url: user.photoURL
          })
          .select();

        if (error) throw error;

        // Check if user is suspended
        if (data && data[0]?.is_suspended) {
          alert("Your account is suspended by the administrator.");
          await logout();
          return;
        }

        window.appState.isAdmin = data?.[0]?.is_admin || false;
        updateDrawerHTML(user, window.appState.isAdmin);

        // Update header and mobile menu with admin visibility
        if (headerWrapper) {
          headerWrapper.innerHTML = renderHeader(user, window.appState.isAdmin, parseUrl().path);
        }

        // Check Google Drive storage connection
        const driveToken = await getGoogleDriveToken();
        if (!driveToken) {
          // Trigger the 'Connect storage' consent prompt once
          const consentDismissed = sessionStorage.getItem('gdrive_consent_prompted') === 'true';
          if (!consentDismissed) {
            sessionStorage.setItem('gdrive_consent_prompted', 'true');
            showConnectModal(
              () => {
                window.appState.triggerGoogleConsent();
              },
              () => {
                console.log("Consent dismissed by user.");
              }
            );
          }
        }
      } catch (err) {
        console.error("Signup gating failed:", err);
        alert(err.message || "Failed to register profile. Signups may be closed by the site administrator.");
        await logout();
        updateDrawerHTML(null, false);
        return;
      }
    } else {
      updateDrawerHTML(null, false);
    }

    // Bind header events (search triggers, avatar toggles)
    setupHeaderEvents(user, (query) => {
      HomeView.handleGlobalSearch(query);
    });

    // Handle header upload click
    const uploadBtn = document.getElementById('header-upload-btn');
    if (uploadBtn) {
      uploadBtn.onclick = () => {
        window.appState.showUpload();
      };
    }

    // Handle header sign in button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.onclick = async () => {
        try {
          await loginWithGoogle();
        } catch (err) {
          console.error("Google Authentication error:", err);
        }
      };
    }

    // 4. Trigger router load
    await route();
  });

  // 5. Watch for route changes
  window.addEventListener('popstate', route);

  // Global clean links interceptor
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      // Only intercept local relative links (starting with / and not external/hash)
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        window.appState.navigate(href);
      }
    }
  });

  // 6. Init Google OAuth
  initGoogleOAuthClient();
};

// Start application
initApp();
