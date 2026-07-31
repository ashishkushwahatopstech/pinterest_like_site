import { logout } from '../services/auth';

export const renderHeader = (user, isAdmin, currentRoute) => {
  const isHome = currentRoute === '' || currentRoute.startsWith('home');
  const isProfile = currentRoute.startsWith('profile');
  const isSettings = currentRoute.startsWith('settings');
  const isAdminView = currentRoute.startsWith('admin');

  return `
    <header class="site-header glass">
      <div class="container header-container">
        <!-- Logo & Hamburger -->
        <div style="display: flex; align-items: center; gap: 16px;">
          <button id="menu-toggle-btn" class="btn btn-icon btn-glass" style="display: flex;" aria-label="Open menu">
            <span class="material-icons-outlined">menu</span>
          </button>
          <a href="/" class="brand">
            <span class="material-icons-outlined" style="-webkit-text-fill-color: initial; background: var(--accent-gradient); -webkit-background-clip: text; color: var(--accent-primary); font-size: 2rem;">palette</span>
            <span>PinGrid</span>
          </a>
        </div>

        <!-- Search Bar (Only shown on home/public gallery) -->
        <div class="search-bar" style="visibility: ${isHome ? 'visible' : 'hidden'};">
          <span class="material-icons-outlined" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none;">search</span>
          <input type="text" id="search-input" placeholder="Search ideas, boards, or titles..." autocomplete="off">
          <button id="search-clear-btn" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); cursor: pointer; display: none; background: none; border: none;">
            <span class="material-icons-outlined" style="font-size: 1.1rem;">close</span>
          </button>
        </div>

        <!-- Action Buttons / User Menu -->
        <div class="nav-actions" style="display: flex; align-items: center; gap: 12px;">

          ${user ? `
            <div class="custom-dropdown create-dropdown-container" style="position: relative; display: inline-block;">
              <button id="header-add-dropdown-btn" class="btn btn-primary" style="display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 10px 16px;">
                <span class="material-icons-outlined" style="font-size: 1.2rem;">add</span>
                <span style="font-weight: 600;">Add</span>
                <span class="material-icons-outlined" style="font-size: 1rem; margin-left: 2px;">expand_more</span>
              </button>
              
              <div id="header-add-dropdown-menu" style="right: 0; min-width: 180px; display: none; z-index: 400; position: absolute; top: 100%; padding-top: 8px;">
                <div class="glass" style="display: flex; flex-direction: column; gap: 4px; padding: 6px; border-radius: var(--radius-md); box-shadow: var(--glass-shadow); border: 1px solid var(--border-color); background: var(--glass-bg); width: 100%;">
                  <button class="dropdown-item" id="header-create-board-option" style="width: 100%; text-align: left; display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 0.85rem; padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); border: none; background: transparent;">
                    <span class="material-icons-outlined" style="font-size: 1.15rem; color: var(--accent-primary);">folder</span>
                    <span>Create Board</span>
                  </button>
                  <button class="dropdown-item" id="header-upload-image-option" style="width: 100%; text-align: left; display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 0.85rem; padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text-primary); border: none; background: transparent;">
                    <span class="material-icons-outlined" style="font-size: 1.15rem; color: var(--accent-primary);">add_photo_alternate</span>
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="user-menu" id="user-menu-container">
              <button class="avatar-btn" id="avatar-toggle-btn" aria-label="User menu">
                <img src="${user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="Avatar">
              </button>
              
              <div class="dropdown-menu glass" id="user-dropdown-menu">
                <div style="padding: 10px 14px; font-size: 0.85rem;">
                  <div style="font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.displayName || 'User'}</div>
                  <div style="color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${user.email}</div>
                </div>
                <div class="dropdown-divider"></div>
                <a href="/profile" class="dropdown-item">
                  <span class="material-icons-outlined" style="font-size: 1.2rem;">person</span>
                  <span>My Profile</span>
                </a>
                <a href="/settings" class="dropdown-item">
                  <span class="material-icons-outlined" style="font-size: 1.2rem;">settings</span>
                  <span>Settings</span>
                </a>
                ${isAdmin ? `
                  <a href="/admin" class="dropdown-item" style="color: var(--accent-primary);">
                    <span class="material-icons-outlined" style="font-size: 1.2rem;">admin_panel_settings</span>
                    <span>Admin Panel</span>
                  </a>
                ` : ''}
                <div class="dropdown-divider"></div>
                <button id="logout-btn" class="dropdown-item" style="width: 100%; color: #f87171;">
                  <span class="material-icons-outlined" style="font-size: 1.2rem;">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ` : `
            <button id="login-btn" class="btn btn-primary">
              <span class="material-icons-outlined">login</span>
              <span>Sign In</span>
            </button>
          `}
        </div>
      </div>
    </header>
  `;
};

// Hook header events
export const setupHeaderEvents = (user, onSearch) => {

  // Dropdown toggle
  const avatarBtn = document.getElementById('avatar-toggle-btn');
  const dropdownMenu = document.getElementById('user-dropdown-menu');
  
  if (avatarBtn && dropdownMenu) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await logout();
      } catch (err) {
        alert("Logout failed: " + err.message);
      }
    });
  }

  // Hamburger Drawer toggle
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      const drawer = document.getElementById('sidebar-drawer');
      const drawerBackdrop = document.getElementById('drawer-backdrop');
      if (drawer && drawerBackdrop) {
        drawer.classList.add('show');
        drawerBackdrop.classList.add('show');
      }
    });
  }

  // Search input events
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  
  if (searchInput && onSearch) {
    let debounceTimer;
    
    const triggerSearch = () => {
      const query = searchInput.value.trim();
      if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
      }
      onSearch(query);
    };

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerSearch, 300); // 300ms debounce
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        triggerSearch();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        onSearch('');
      });
    }
  }

  // + Add dropdown toggle event bindings
  const addBtn = document.getElementById('header-add-dropdown-btn');
  const addMenu = document.getElementById('header-add-dropdown-menu');
  const addContainer = document.querySelector('.create-dropdown-container');

  if (addBtn && addMenu && addContainer) {
    const showMenu = () => {
      addMenu.style.display = 'flex';
      addContainer.classList.add('active');
      const arrowIcon = addBtn.querySelector('.material-icons-outlined:last-child');
      if (arrowIcon) arrowIcon.textContent = 'expand_less';
    };
    const hideMenu = () => {
      addMenu.style.display = 'none';
      addContainer.classList.remove('active');
      const arrowIcon = addBtn.querySelector('.material-icons-outlined:last-child');
      if (arrowIcon) arrowIcon.textContent = 'expand_more';
    };

    // Hover triggers (only on larger desktop viewports)
    addContainer.addEventListener('mouseenter', () => {
      if (window.innerWidth >= 768) showMenu();
    });
    addContainer.addEventListener('mouseleave', () => {
      if (window.innerWidth >= 768) hideMenu();
    });

    // Touch/Click triggers (for mobile and fallbacks)
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = addMenu.style.display === 'flex';
      if (isVisible) {
        hideMenu();
      } else {
        showMenu();
      }
    });

    // Close on outer screen click
    document.addEventListener('click', (e) => {
      if (!addContainer.contains(e.target)) {
        hideMenu();
      }
    });

    // Sub-option triggers
    const createBoardOpt = document.getElementById('header-create-board-option');
    if (createBoardOpt) {
      createBoardOpt.addEventListener('click', (e) => {
        e.stopPropagation();
        hideMenu();
        if (window.appState && window.appState.showCreateBoard) {
          window.appState.showCreateBoard();
        }
      });
    }

    const uploadImageOpt = document.getElementById('header-upload-image-option');
    if (uploadImageOpt) {
      uploadImageOpt.addEventListener('click', (e) => {
        e.stopPropagation();
        hideMenu();
        if (window.appState && window.appState.showUpload) {
          window.appState.showUpload();
        }
      });
    }
  }
};
