import './index.css';
import { subscribeToAuth, loginWithGoogle, logout } from './services/auth';
import { getSupabase, supabasePublic, isUserAdmin } from './services/supabase';
import { getGoogleDriveToken, connectGoogleDrive } from './services/api';
import { getRootFolder, getOrCreateBoardFolder, uploadFileToDrive, makeFilePublic, deleteFromDrive } from './services/drive';

// Views
import { HomeView } from './views/HomeView';
import { BoardView } from './views/BoardView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { SettingsView } from './views/SettingsView';

// Components
import { renderHeader, setupHeaderEvents } from './components/Header';
import { renderFooter } from './components/Footer';
import { renderModalsHtml, showConnectModal, showCreateBoardModal, showUploadModal } from './components/Modals';
import { renderLightbox, setupLightboxEvents } from './components/Lightbox';

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
  
  // Expose triggers
  showCreateBoard: () => {
    showCreateBoardModal(async (name, isPublic) => {
      const supabase = await getSupabase();
      const accessToken = await getGoogleDriveToken();
      if (!accessToken) throw new Error("Google Drive storage is disconnected.");

      // 1. Create folder in Google Drive first
      const rootFolderId = await getRootFolder(accessToken);
      const driveFolderId = await getOrCreateBoardFolder(accessToken, rootFolderId, name);

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
        .order('name');
        
      if (error) {
        alert("Failed to load boards: " + error.message);
        return;
      }

      showUploadModal(
        boards,
        async (boardId, file, title, description, progressCallback) => {
          const accessToken = await getGoogleDriveToken();
          if (!accessToken) throw new Error("Google Drive storage disconnected.");

          // Find active board
          const activeBoard = boards.find(b => b.id === boardId);
          if (!activeBoard) throw new Error("Board not found.");

          // 1. Upload to Google Drive
          const driveFile = await uploadFileToDrive(accessToken, activeBoard.drive_folder_id, file, title, description, progressCallback);
          
          // 2. Set file permissions on Google Drive to public read
          await makeFilePublic(accessToken, driveFile.id);

          // 3. (Optional) Backup upload to Supabase Storage if enabled
          let supabasePath = null;
          const isBackupEnabled = localStorage.getItem('backup_storage_enabled') === 'true';
          if (isBackupEnabled) {
            try {
              // Convent path: siteName/{firebase_uid}/{board}/{filename}
              const fileExt = file.name.split('.').pop();
              const filename = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
              const path = `${window.appState.siteSettings.site_name}/${window.appState.currentUser.uid}/${activeBoard.name}/${filename}`;
              
              const { data: storageData, error: storageErr } = await supabase.storage
                .from('gallery-backups')
                .upload(path, file, { cacheControl: '3600', upsert: true });

              if (storageErr) throw storageErr;
              supabasePath = path;
            } catch (backupErr) {
              console.error("Supabase Storage backup failed:", backupErr);
              // Do not fail the entire upload if backup fails - it's secondary!
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
              drive_file_id: driveFile.id,
              drive_view_link: `https://lh3.googleusercontent.com/d/${driveFile.id}`,
              drive_download_link: `https://drive.google.com/uc?export=download&id=${driveFile.id}`,
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
      .select('*, users(*), boards(*)')
      .eq('id', imageId)
      .single();

    if (error || !data) return;

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
      }
    });
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
    link.addEventListener('click', closeDrawer);
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

// --- APPLICATION ROUTING ENGINES ---
const parseHash = () => {
  const hash = window.location.hash.substring(1) || 'home';
  const [path, queryString] = hash.split('?');
  
  // Parse query properties
  const query = {};
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });
  }

  return { path, query };
};

const route = async () => {
  const { path, query } = parseHash();
  
  // Close drawer nav
  updateDrawerNav(path);

  // Router views
  if (path.startsWith('home') || path === '') {
    await HomeView.render({ boardId: query.boardId, q: query.q });
  } else if (path.startsWith('board/')) {
    const boardId = path.split('/')[1];
    await BoardView.render({ id: boardId });
  } else if (path === 'profile') {
    await ProfileView.render();
  } else if (path === 'settings') {
    await SettingsView.render();
  } else if (path === 'admin') {
    await AdminView.render();
  } else {
    window.location.hash = 'home';
  }

  // Handle lightbox detail parameter
  if (query.pin) {
    await openLightboxOverlay(query.pin);
  } else {
    const wrapper = document.getElementById('lightbox-wrapper');
    if (wrapper) wrapper.innerHTML = '';
  }
};

// --- APPLICATION INITIALIZATION ---
const initApp = async () => {
  // 1. Load settings and banner first
  await loadBrandingSettings();

  // 2. Setup drawer events
  setupDrawerNav();

  // 3. Subscribe to auth changes
  subscribeToAuth(async (user) => {
    window.appState.currentUser = user;
    window.appState.isAdmin = false;

    // Show header in loading state
    const headerWrapper = document.getElementById('header-wrapper');
    const modalsWrapper = document.getElementById('modals-wrapper');
    
    if (headerWrapper) {
      headerWrapper.innerHTML = renderHeader(user, false, parseHash().path);
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

        // Update header and mobile menu with admin visibility
        if (headerWrapper) {
          headerWrapper.innerHTML = renderHeader(user, window.appState.isAdmin, parseHash().path);
        }
        
        const adminLink = document.getElementById('drawer-link-admin');
        if (adminLink) {
          adminLink.style.display = window.appState.isAdmin ? 'flex' : 'none';
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
        return;
      }
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
  window.addEventListener('hashchange', route);

  // 6. Init Google OAuth
  initGoogleOAuthClient();
};

// Start application
initApp();
