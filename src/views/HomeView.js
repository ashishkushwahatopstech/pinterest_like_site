import { supabasePublic, getSupabase } from '../services/supabase';
import { renderMasonryGrid, setupGridEvents, setupInfiniteScroll } from '../components/MasonryGrid';
import { renderPinSkeleton } from '../components/Skeleton';

const PAGE_SIZE = 15;

export const HomeView = {
  containerId: 'view-container',
  images: [],
  boards: [],
  selectedBoardId: null,
  searchQuery: '',
  selectedDateFilter: 'all', // 'all' | 'day' | 'week' | 'month'
  selectedShapeFilter: 'all', // 'all' | 'portrait' | 'landscape' | 'square'
  page: 0,
  hasMore: false,
  loading: false,

  render: async function(params = {}) {
    // Read state from URL search parameters (for sharing/deep-linking)
    const urlParams = new URLSearchParams(window.location.search);
    
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
      this.fetchImages()
    ]);

    this.renderFilters();
    this.renderGrid();
  },

  fetchPublicBoards: async function() {
    try {
      const { data, error } = await supabasePublic
        .from('boards')
        .select('id, name')
        .eq('is_public', true)
        .order('name');
        
      if (error) throw error;
      this.boards = data || [];
    } catch (err) {
      console.error("Error fetching public boards:", err);
    }
  },

  fetchImages: async function() {
    this.loading = true;
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

      if (data) {
        let fetchedData = data || [];
        // Apply Shape/Orientation filter client-side by pre-resolving aspects
        if (this.selectedShapeFilter && this.selectedShapeFilter !== 'all') {
          fetchedData = await this.filterImagesByShape(fetchedData, this.selectedShapeFilter);
        }
        this.images = [...this.images, ...fetchedData];
        this.hasMore = data.length === PAGE_SIZE;
      }
    } catch (err) {
      console.error("Error fetching gallery images:", err);
    } finally {
      this.loading = false;
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

    // Convert filterContainer style to a modern wrap layout
    filterContainer.style.display = 'flex';
    filterContainer.style.gap = '16px';
    filterContainer.style.flexWrap = 'wrap';
    filterContainer.style.overflowX = 'visible';
    filterContainer.style.paddingBottom = '0';
    filterContainer.style.marginBottom = '32px';

    filterContainer.innerHTML = `
      <div style="display: flex; gap: 16px; flex-wrap: wrap; width: 100%; align-items: center;">
        <!-- In-View Search Input -->
        <div class="search-bar" style="position: relative; flex: 1; min-width: 240px; margin-right: auto; max-width: 400px; display: block; visibility: visible;">
          <span class="material-icons-outlined" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none;">search</span>
          <input type="text" id="home-search-input" placeholder="Search titles, descriptions..." style="width: 100%; padding: 12px 16px 12px 42px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.95rem; font-family: var(--font-body); transition: var(--transition-fast);" value="${this.searchQuery || ''}">
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <!-- Board Select -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Collection</span>
            <select id="home-board-select" class="btn btn-glass" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; font-weight: 500; cursor: pointer; outline: none;">
              <option value="">All Collections</option>
              ${this.boards.map(b => `<option value="${b.id}" ${this.selectedBoardId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>

          <!-- Date Select -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Added</span>
            <select id="home-date-select" class="btn btn-glass" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; font-weight: 500; cursor: pointer; outline: none;">
              <option value="all" ${this.selectedDateFilter === 'all' ? 'selected' : ''}>All Time</option>
              <option value="day" ${this.selectedDateFilter === 'day' ? 'selected' : ''}>Last 24 Hours</option>
              <option value="week" ${this.selectedDateFilter === 'week' ? 'selected' : ''}>Past Week</option>
              <option value="month" ${this.selectedDateFilter === 'month' ? 'selected' : ''}>Past Month</option>
            </select>
          </div>

          <!-- Shape/Orientation Select -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Shape</span>
            <select id="home-shape-select" class="btn btn-glass" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; font-weight: 500; cursor: pointer; outline: none;">
              <option value="all" ${this.selectedShapeFilter === 'all' ? 'selected' : ''}>All Shapes</option>
              <option value="portrait" ${this.selectedShapeFilter === 'portrait' ? 'selected' : ''}>Portrait</option>
              <option value="landscape" ${this.selectedShapeFilter === 'landscape' ? 'selected' : ''}>Landscape</option>
              <option value="square" ${this.selectedShapeFilter === 'square' ? 'selected' : ''}>Square</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Bind event listeners
    const searchInp = document.getElementById('home-search-input');
    const boardSel = document.getElementById('home-board-select');
    const dateSel = document.getElementById('home-date-select');
    const shapeSel = document.getElementById('home-shape-select');

    const handleFilterChange = async () => {
      this.searchQuery = searchInp ? searchInp.value.trim() : '';
      this.selectedBoardId = boardSel ? boardSel.value : null;
      this.selectedDateFilter = dateSel ? dateSel.value : 'all';
      this.selectedShapeFilter = shapeSel ? shapeSel.value : 'all';
      
      // Update URL parameters
      const params = new URLSearchParams();
      if (this.searchQuery) params.set('q', this.searchQuery);
      if (this.selectedBoardId) params.set('boardId', this.selectedBoardId);
      if (this.selectedDateFilter !== 'all') params.set('date', this.selectedDateFilter);
      if (this.selectedShapeFilter !== 'all') params.set('shape', this.selectedShapeFilter);
      
      const searchStr = params.toString();
      window.history.replaceState({}, '', '/' + (searchStr ? '?' + searchStr : ''));

      // Reload grid data
      this.images = [];
      this.page = 0;
      this.hasMore = false;
      
      const gridContainer = document.getElementById('grid-container');
      if (gridContainer) gridContainer.innerHTML = renderPinSkeleton(10);
      
      await this.fetchImages();
      this.renderGrid();
    };

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

    if (boardSel) boardSel.addEventListener('change', handleFilterChange);
    if (dateSel) dateSel.addEventListener('change', handleFilterChange);
    if (shapeSel) shapeSel.addEventListener('change', handleFilterChange);
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

    gridContainer.innerHTML = renderMasonryGrid(this.images, this.hasMore);

    // Setup Grid event listeners (Clicks & Likes)
    const gridEl = document.getElementById('gallery-masonry-grid');
    if (gridEl) {
      setupGridEvents(
        gridEl,
        (pinId) => {
          const currentPath = window.location.pathname;
          const currentSearch = window.location.search;
          const connector = currentSearch.includes('?') ? '&' : '?';
          window.appState.navigate(`${currentPath}${currentSearch}${connector}pin=${pinId}`);
        },
        async (pinId, likeBtn) => {
          if (window.appState && window.appState.toggleLike) {
            await window.appState.toggleLike(pinId, likeBtn);
          }
        }
      );
    }

    // Setup Infinite scroll observer
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
