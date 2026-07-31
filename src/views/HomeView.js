import { supabasePublic, getSupabase } from '../services/supabase';
import { renderMasonryGrid, setupGridEvents, setupInfiniteScroll } from '../components/MasonryGrid';
import { renderPinSkeleton } from '../components/Skeleton';
import { sortRecommendedFeed, trackUserSearch } from '../services/recommendations';

const PAGE_SIZE = 15;

export const HomeView = {
  containerId: 'view-container',
  images: [],
  boards: [],
  trendingBoardIds: [],
  selectedBoardId: null,
  searchQuery: '',
  selectedDateFilter: 'all', // 'all' | 'day' | 'week' | 'month'
  selectedShapeFilter: 'all', // 'all' | 'portrait' | 'landscape' | 'square'
  page: 0,
  activeFetchId: 0,
  hasMore: false,
  loading: false,

  render: async function(params = {}) {
    // Read state from URL search parameters (for sharing/deep-linking)
    const urlParams = new URLSearchParams(window.location.search);
    
    if (window.appState.updateSEO) {
      window.appState.updateSEO("Discover Creative Ideas & Wallpapers", "Explore custom-curated cloud storage image collections, shared pins, and beautiful galleries on the PinGrid network.");
    }
    
    this.images = [];
    this.boards = [];
    this.page = 0;
    this.hasMore = false;
    this.loading = true;
    this.selectedBoardId = urlParams.get('boardId') || null;
    this.searchQuery = urlParams.get('q') || '';
    this.selectedDateFilter = urlParams.get('date') || 'all';
    this.selectedShapeFilter = urlParams.get('shape') || 'all';

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Render header title and initial layout
    container.innerHTML = `
      <section class="hero animate-fade">
        <h1 id="home-title">Discover Creative Ideas</h1>
        <p id="home-desc">Explore beautiful collections uploaded by creators around the world, stored securely on their personal cloud drives.</p>
      </section>
      
      <div class="container">
        <!-- Trending Collections Section -->
        <div id="trending-collections-tray" style="margin-bottom: 40px; display: none;"></div>

        <!-- Interactive Filter Panel -->
        <div id="board-filters">
          <div style="display: flex; gap: 16px; flex-wrap: wrap; width: 100%; align-items: center; margin-bottom: 32px;">
            <div class="skeleton" style="width: 250px; height: 40px; border-radius: var(--radius-md);"></div>
            <div class="skeleton" style="width: 120px; height: 40px; border-radius: var(--radius-md);"></div>
            <div class="skeleton" style="width: 120px; height: 40px; border-radius: var(--radius-md);"></div>
          </div>
        </div>

        <!-- Masonry Grid with Skeleton -->
        <div id="grid-container" class="masonry-container">
          ${renderPinSkeleton(10)}
        </div>
      </div>
    `;

    // Fetch filters and data
    await Promise.all([
      this.fetchPublicBoards(),
      this.fetchTrendingSettings(),
      this.fetchImages()
    ]);

    this.renderFilters();
    this.renderGrid();
    this.renderTrendingCollections();
  },

  fetchPublicBoards: async function() {
    try {
      const { data, error } = await supabasePublic
        .from('boards')
        .select('id, name, description, user_id, users(display_name), images(drive_file_id, drive_view_link)')
        .eq('is_public', true)
        .order('name');
        
      if (error) throw error;
      this.boards = data || [];
    } catch (err) {
      console.error("Error fetching public boards:", err);
    }
  },

  fetchTrendingSettings: async function() {
    try {
      const { data, error } = await supabasePublic
        .from('site_settings')
        .select('*')
        .eq('key', 'trending_boards')
        .single();
      
      if (!error && data) {
        this.trendingBoardIds = JSON.parse(data.value) || [];
      } else {
        this.trendingBoardIds = [];
      }
    } catch (err) {
      this.trendingBoardIds = [];
    }
  },

  getTrendingBoardIds: function() {
    if (this.trendingBoardIds && this.trendingBoardIds.length > 0) {
      return this.trendingBoardIds;
    }
    // Fallback to first 4 board IDs as trending
    return this.boards.slice(0, 4).map(b => b.id);
  },

  renderTrendingCollections: function() {
    const tray = document.getElementById('trending-collections-tray');
    if (!tray) return;

    // Show ONLY on default home view (no active filters or search query)
    if (this.selectedBoardId || this.searchQuery) {
      tray.style.display = 'none';
      return;
    }

    const trendingIds = this.getTrendingBoardIds();
    const trendingBoards = this.boards.filter(b => trendingIds.includes(b.id)).slice(0, 4);

    if (trendingBoards.length === 0) {
      tray.style.display = 'none';
      return;
    }

    const cardsHtml = trendingBoards.map(b => {
      const coverImg = b.images && b.images.length > 0
        ? (b.images[0].drive_view_link || `https://lh3.googleusercontent.com/d/${b.images[0].drive_file_id}`)
        : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80';
      
      const count = b.images ? b.images.length : 0;
      
      return `
        <div class="trending-collection-card glass" style="border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column; cursor: pointer; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);" onclick="event.preventDefault(); window.appState.navigate('/board/${window.appState.slugify(b.name)}--${b.id}')">
          <div style="height: 120px; overflow: hidden; position: relative;">
            <img src="${coverImg}" alt="${b.name} Collection Cover" style="width: 100%; height: 100%; object-fit: cover;" class="collection-cover-img">
            <span style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.65); color: #fff; padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.7rem; font-weight: 600; backdrop-filter: blur(4px);">
              ${count} ${count === 1 ? 'Pin' : 'Pins'}
            </span>
          </div>
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 4px;">
            <h4 style="font-family: var(--font-heading); font-size: 1rem; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.name}</h4>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-secondary);">
              <span>by ${b.users?.display_name || 'Anonymous'}</span>
              <span class="material-icons-outlined" style="font-size: 0.9rem; color: var(--accent-primary);">trending_up</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    tray.style.display = 'block';
    tray.innerHTML = `
      <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        <span class="material-icons-outlined" style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">local_fire_department</span>
        <span>Featured Collections</span>
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        ${cardsHtml}
      </div>
    `;
  },

  showGridLoadingSkeletons: function(show) {
    const grid = document.getElementById('gallery-masonry-grid');
    if (!grid) return;
    
    let skeletons = document.getElementById('grid-loading-skeletons');
    if (show) {
      if (!skeletons) {
        skeletons = document.createElement('div');
        skeletons.id = 'grid-loading-skeletons';
        skeletons.className = 'masonry-grid';
        skeletons.style.marginTop = '16px';
        skeletons.innerHTML = renderPinSkeleton(5);
        grid.parentNode.insertBefore(skeletons, grid.nextSibling);
      }
    } else {
      if (skeletons) {
        skeletons.remove();
      }
    }
  },

  fetchImages: async function() {
    this.loading = true;
    const currentFetchId = ++this.activeFetchId;
    
    if (this.page > 0) {
      this.showGridLoadingSkeletons(true);
    }

    try {
      const user = window.appState?.currentUser;
      const supabase = user ? await getSupabase() : supabasePublic;

      let query = supabase
        .from('images')
        .select('*, users!images_user_id_fkey(*), boards(*)')
        .order('created_at', { ascending: false });

      // Apply Board filter
      if (this.selectedBoardId) {
        query = query.eq('board_id', this.selectedBoardId);
      }

      // Apply Search filter
      if (this.searchQuery) {
        query = query.or(`title.ilike.%${this.searchQuery}%,description.ilike.%${this.searchQuery}%`);
      }

      // Apply Date filter (SQL level)
      if (this.selectedDateFilter && this.selectedDateFilter !== 'all') {
        let days = 1;
        if (this.selectedDateFilter === 'week') days = 7;
        else if (this.selectedDateFilter === 'month') days = 30;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', cutoffDate);
      }

      // Pagination bounds
      const from = this.page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (currentFetchId !== this.activeFetchId) return;

      if (data) {
        let fetchedData = data || [];
        // Apply Shape/Orientation filter client-side by pre-resolving aspects
        if (this.selectedShapeFilter && this.selectedShapeFilter !== 'all') {
          fetchedData = await this.filterImagesByShape(fetchedData, this.selectedShapeFilter);
        }
        
        if (currentFetchId !== this.activeFetchId) return;

        if (this.page === 0) {
          this.images = sortRecommendedFeed(fetchedData);
        } else {
          // Merge new images and deduplicate by ID
          const combined = [...this.images, ...fetchedData];
          const uniqueMap = new Map();
          combined.forEach(img => {
            if (!uniqueMap.has(img.id)) {
              uniqueMap.set(img.id, img);
            }
          });
          this.images = Array.from(uniqueMap.values());
        }
        this.hasMore = data.length === PAGE_SIZE;
      }
    } catch (err) {
      if (currentFetchId === this.activeFetchId) {
        console.error("Error fetching gallery images:", err);
      }
    } finally {
      if (currentFetchId === this.activeFetchId) {
        this.loading = false;
        this.showGridLoadingSkeletons(false);
      }
    }
  },

  filterImagesByShape: function(images, shape) {
    return new Promise(async (resolve) => {
      const checkOrientation = (imgRecord) => {
        return new Promise((res) => {
          const tempImg = new Image();
          tempImg.onload = () => {
            const ratio = tempImg.naturalWidth / tempImg.naturalHeight;
            if (shape === 'landscape' && ratio > 1.1) res(true);
            else if (shape === 'portrait' && ratio < 0.9) res(true);
            else if (shape === 'square' && ratio >= 0.9 && ratio <= 1.1) res(true);
            else res(false);
          };
          tempImg.onerror = () => res(false);
          tempImg.src = imgRecord.drive_view_link;
        });
      };
      
      const results = await Promise.all(images.map(img => checkOrientation(img)));
      resolve(images.filter((_, idx) => results[idx]));
    });
  },

  loadMore: async function() {
    if (this.loading || !this.hasMore) return;
    this.page++;
    await this.fetchImages();
    this.renderGrid();
  },

  renderFilters: function() {
    const filterContainer = document.getElementById('board-filters');
    if (!filterContainer) return;

    filterContainer.style.display = 'block';
    filterContainer.style.marginBottom = '32px';

    const selectedBoardName = this.selectedBoardId 
      ? (this.boards.find(b => b.id === this.selectedBoardId)?.name || 'Collection') 
      : 'All Collections';

    const selectedDateName = 
      this.selectedDateFilter === 'day' ? 'Last 24 Hours' :
      this.selectedDateFilter === 'week' ? 'Past Week' :
      this.selectedDateFilter === 'month' ? 'Past Month' : 'All Time';

    const selectedShapeName = 
      this.selectedShapeFilter === 'portrait' ? 'Portrait' :
      this.selectedShapeFilter === 'landscape' ? 'Landscape' :
      this.selectedShapeFilter === 'square' ? 'Square' : 'All Shapes';

    filterContainer.innerHTML = `
      <div class="filter-panel-wrapper">
        <div class="filter-search-row">
          <!-- In-View Search Input -->
          <div class="search-bar home-search-bar">
            <span class="material-icons-outlined" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none;">search</span>
            <input type="text" id="home-search-input" placeholder="Search titles, descriptions..." value="${this.searchQuery || ''}">
          </div>

          <!-- Toggle Filters Button -->
          <button id="mobile-filter-toggle-btn" class="btn btn-glass" style="padding: 12px 16px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-outlined">tune</span>
            <span class="btn-text-responsive">Filters</span>
          </button>
        </div>

        <!-- Collapsible Selectors Wrapper -->
        <div id="collapsible-filters" class="collapsible-filters-pane">
          <!-- Board Custom Dropdown -->
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; position: relative; z-index: 3;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; min-width: 65px;">Collection</span>
            <div class="custom-dropdown" id="board-dropdown-wrapper">
              <button class="custom-dropdown-trigger" id="board-dropdown-trigger">
                <span class="trigger-label">${selectedBoardName}</span>
                <span class="material-icons-outlined select-arrow">expand_more</span>
              </button>
              <div class="custom-dropdown-menu glass" id="board-dropdown-menu">
                <div class="dropdown-search-box">
                  <span class="material-icons-outlined">search</span>
                  <input type="text" id="board-dropdown-search" placeholder="Search collections..." autocomplete="off">
                </div>
                <div class="dropdown-options-list" id="board-options-list">
                  <div class="dropdown-option ${!this.selectedBoardId ? 'selected' : ''}" data-value="">All Collections</div>
                  
                  ${(() => {
                    const trendingIds = this.getTrendingBoardIds();
                    return this.boards.map(b => {
                      const isTrending = trendingIds.includes(b.id);
                      return `
                        <div class="dropdown-option ${this.selectedBoardId === b.id ? 'selected' : ''}" data-value="${b.id}" style="padding-left: 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
                          <span>${b.name}</span>
                          ${isTrending ? `
                            <svg style="width: 16px; height: 16px; fill: #ff3366; flex-shrink: 0;" viewBox="0 0 24 24" title="Trending">
                              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
                            </svg>
                          ` : ''}
                        </div>
                      `;
                    }).join('');
                  })()}
                </div>
              </div>
            </div>
          </div>

          <!-- Date Custom Dropdown -->
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; position: relative; z-index: 2;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; min-width: 65px;">Added</span>
            <div class="custom-dropdown" id="date-dropdown-wrapper">
              <button class="custom-dropdown-trigger" id="date-dropdown-trigger">
                <span class="trigger-label">${selectedDateName}</span>
                <span class="material-icons-outlined select-arrow">expand_more</span>
              </button>
              <div class="custom-dropdown-menu glass" id="date-dropdown-menu">
                <div class="dropdown-options-list">
                  <div class="dropdown-option ${this.selectedDateFilter === 'all' ? 'selected' : ''}" data-value="all">All Time</div>
                  <div class="dropdown-option ${this.selectedDateFilter === 'day' ? 'selected' : ''}" data-value="day">Last 24 Hours</div>
                  <div class="dropdown-option ${this.selectedDateFilter === 'week' ? 'selected' : ''}" data-value="week">Past Week</div>
                  <div class="dropdown-option ${this.selectedDateFilter === 'month' ? 'selected' : ''}" data-value="month">Past Month</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Shape Custom Dropdown -->
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; position: relative; z-index: 1;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; min-width: 65px;">Shape</span>
            <div class="custom-dropdown" id="shape-dropdown-wrapper">
              <button class="custom-dropdown-trigger" id="shape-dropdown-trigger">
                <span class="trigger-label">${selectedShapeName}</span>
                <span class="material-icons-outlined select-arrow">expand_more</span>
              </button>
              <div class="custom-dropdown-menu glass" id="shape-dropdown-menu">
                <div class="dropdown-options-list">
                  <div class="dropdown-option ${this.selectedShapeFilter === 'all' ? 'selected' : ''}" data-value="all">All Shapes</div>
                  <div class="dropdown-option ${this.selectedShapeFilter === 'portrait' ? 'selected' : ''}" data-value="portrait">Portrait</div>
                  <div class="dropdown-option ${this.selectedShapeFilter === 'landscape' ? 'selected' : ''}" data-value="landscape">Landscape</div>
                  <div class="dropdown-option ${this.selectedShapeFilter === 'square' ? 'selected' : ''}" data-value="square">Square</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind search and filter events
    const searchInp = document.getElementById('home-search-input');
    
    // Toggle Mobile Filters Drawer
    const toggleBtn = document.getElementById('mobile-filter-toggle-btn');
    const collapsiblePane = document.getElementById('collapsible-filters');
    
    if (toggleBtn && collapsiblePane) {
      const isMobilePaneOpened = sessionStorage.getItem('mobile_filters_pane_opened') === 'true';
      if (isMobilePaneOpened) {
        collapsiblePane.classList.add('show-mobile-filters');
        toggleBtn.classList.add('btn-primary');
      }

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        collapsiblePane.classList.toggle('show-mobile-filters');
        const isShown = collapsiblePane.classList.contains('show-mobile-filters');
        sessionStorage.setItem('mobile_filters_pane_opened', isShown ? 'true' : 'false');
        if (isShown) {
          toggleBtn.classList.add('btn-primary');
        } else {
          toggleBtn.classList.remove('btn-primary');
        }
      });
    }

    const handleFilterChange = async () => {
      this.searchQuery = searchInp ? searchInp.value.trim() : '';
      if (this.searchQuery) {
        trackUserSearch(this.searchQuery);
      }
      
      const params = new URLSearchParams();
      if (this.searchQuery) params.set('q', this.searchQuery);
      if (this.selectedBoardId) params.set('boardId', this.selectedBoardId);
      if (this.selectedDateFilter !== 'all') params.set('date', this.selectedDateFilter);
      if (this.selectedShapeFilter !== 'all') params.set('shape', this.selectedShapeFilter);
      
      const searchStr = params.toString();
      window.history.replaceState({}, '', '/' + (searchStr ? '?' + searchStr : ''));

      this.images = [];
      this.page = 0;
      this.hasMore = false;
      
      const gridContainer = document.getElementById('grid-container');
      if (gridContainer) gridContainer.innerHTML = renderPinSkeleton(10);
      
      await this.fetchImages();
      this.renderGrid();
      this.renderTrendingCollections();
    };

    // Helper to setup custom dropdown selection
    const setupCustomDropdown = (triggerId, menuId, onSelect) => {
      const trigger = document.getElementById(triggerId);
      const menu = document.getElementById(menuId);
      if (!trigger || !menu) return;

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close all other menus first
        document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
          if (m !== menu) m.classList.remove('show');
        });
        
        menu.classList.toggle('show');
      });

      menu.querySelectorAll('.dropdown-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = option.dataset.value;
          const label = option.textContent;
          
          trigger.querySelector('.trigger-label').textContent = label;
          menu.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          
          menu.classList.remove('show');
          onSelect(val);
        });
      });
    };

    // Initialize custom dropdowns
    setupCustomDropdown('board-dropdown-trigger', 'board-dropdown-menu', async (val) => {
      this.selectedBoardId = val ? val : null;
      await handleFilterChange();
    });

    setupCustomDropdown('date-dropdown-trigger', 'date-dropdown-menu', async (val) => {
      this.selectedDateFilter = val;
      await handleFilterChange();
    });

    setupCustomDropdown('shape-dropdown-trigger', 'shape-dropdown-menu', async (val) => {
      this.selectedShapeFilter = val;
      await handleFilterChange();
    });

    // Collection searching logic
    const boardSearch = document.getElementById('board-dropdown-search');
    if (boardSearch) {
      boardSearch.addEventListener('click', (e) => e.stopPropagation()); // Prevent close
      boardSearch.addEventListener('input', () => {
        const query = boardSearch.value.toLowerCase().trim();
        const optionsList = document.getElementById('board-options-list');
        if (optionsList) {
          optionsList.querySelectorAll('.dropdown-option').forEach(opt => {
            const val = opt.textContent.toLowerCase();
            if (val.includes(query) || opt.dataset.value === "") {
              opt.style.display = 'flex';
            } else {
              opt.style.display = 'none';
            }
          });
        }
      });
    }

    // Close all custom dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('show'));
    });

    if (searchInp) {
      let debounceTimer;
      searchInp.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleFilterChange, 300);
      });
      searchInp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(debounceTimer);
          handleFilterChange();
        }
      });
    }
  },

  renderGrid: function() {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;

    if (this.images.length === 0) {
      gridContainer.innerHTML = `
        <div class="glass text-center animate-fade" style="padding: 64px 24px; text-align: center; border-radius: var(--radius-lg); width: 100%;">
          <span class="material-icons-outlined" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 16px;">image_not_supported</span>
          <h2 style="font-size: 1.3rem; margin-bottom: 8px;">No images found</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Be the first to upload an image, or adjust your search filters above.</p>
        </div>
      `;
      return;
    }

    const showButton = this.page >= 2;
    gridContainer.innerHTML = renderMasonryGrid(this.images, this.hasMore, 'gallery-masonry-grid', showButton);

    // Setup Grid event listeners (Clicks & Likes)
    const gridEl = document.getElementById('gallery-masonry-grid');
    if (gridEl) {
      setupGridEvents(
        gridEl,
        (pinId) => {
          const imgObj = this.images.find(img => img.id === pinId);
          const slug = imgObj ? window.appState.slugify(imgObj.title) : 'pin';
          sessionStorage.setItem('lightbox_referrer', window.location.pathname + window.location.search);
          window.appState.navigate(`/pin/${slug}--${pinId}`);
        },
        async (pinId, likeBtn) => {
          if (window.appState && window.appState.toggleLike) {
            await window.appState.toggleLike(pinId, likeBtn);
          }
        }
      );
    }

    // Setup Load More button click if rendered
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.onclick = () => this.loadMore();
    }

    // Setup Infinite scroll observer if sentinel is present (scroll limits not hit yet)
    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (sentinel) {
      setupInfiniteScroll(sentinel, () => this.loadMore());
    }
  },

  handleGlobalSearch: function(query) {
    this.searchQuery = query;
    
    // Sync with the in-view input if rendered
    const searchInp = document.getElementById('home-search-input');
    if (searchInp) {
      searchInp.value = query;
    }
    
    // Trigger filters update
    const boardSel = document.getElementById('home-board-select');
    const dateSel = document.getElementById('home-date-select');
    const shapeSel = document.getElementById('home-shape-select');
    
    this.selectedBoardId = boardSel ? boardSel.value : null;
    this.selectedDateFilter = dateSel ? dateSel.value : 'all';
    this.selectedShapeFilter = shapeSel ? shapeSel.value : 'all';

    const params = new URLSearchParams();
    if (this.searchQuery) params.set('q', this.searchQuery);
    if (this.selectedBoardId) params.set('boardId', this.selectedBoardId);
    if (this.selectedDateFilter !== 'all') params.set('date', this.selectedDateFilter);
    if (this.selectedShapeFilter !== 'all') params.set('shape', this.selectedShapeFilter);

    const searchStr = params.toString();
    window.history.replaceState({}, '', '/' + (searchStr ? '?' + searchStr : ''));

    this.images = [];
    this.page = 0;
    this.hasMore = false;
    
    const gridContainer = document.getElementById('grid-container');
    if (gridContainer) gridContainer.innerHTML = renderPinSkeleton(10);
    
    this.fetchImages().then(() => this.renderGrid());
  }
};
