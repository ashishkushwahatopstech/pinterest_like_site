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
  page: 0,
  hasMore: false,
  loading: false,

  render: async function(params = {}) {
    // Reset state
    this.images = [];
    this.boards = [];
    this.page = 0;
    this.hasMore = false;
    this.loading = true;
    this.selectedBoardId = params.boardId || null;
    this.searchQuery = params.q || '';

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Render skeleton initially
    container.innerHTML = `
      <section class="hero animate-fade">
        <h1 id="home-title">Discover Creative Ideas</h1>
        <p id="home-desc">Explore beautiful collections uploaded by creators around the world, stored securely on their personal cloud drives.</p>
      </section>
      
      <div class="container">
        <!-- Board Filter Pills -->
        <div id="board-filters" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 24px; scrollbar-width: none;">
          <div class="skeleton" style="width: 80px; height: 35px; border-radius: var(--radius-full);"></div>
          <div class="skeleton" style="width: 100px; height: 35px; border-radius: var(--radius-full);"></div>
          <div class="skeleton" style="width: 90px; height: 35px; border-radius: var(--radius-full);"></div>
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
      let query = supabasePublic
        .from('boards')
        .select('id, name')
        .eq('is_public', true)
        .order('name');
        
      if (this.searchQuery) {
        query = query.ilike('name', `%${this.searchQuery}%`);
      }

      const { data, error } = await query;
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

      // Pagination bounds
      const from = this.page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        this.images = [...this.images, ...data];
        this.hasMore = data.length === PAGE_SIZE;
      }
    } catch (err) {
      console.error("Error fetching gallery images:", err);
    } finally {
      this.loading = false;
    }
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

    const allActive = !this.selectedBoardId;
    let html = `
      <button class="btn ${allActive ? 'btn-primary' : 'btn-glass'}" id="filter-all-btn" style="padding: 8px 16px; font-size: 0.85rem;">
        All
      </button>
    `;

    html += this.boards.map(b => {
      const active = this.selectedBoardId === b.id;
      return `
        <button class="btn ${active ? 'btn-primary' : 'btn-glass'} filter-board-btn" data-id="${b.id}" style="padding: 8px 16px; font-size: 0.85rem;">
          ${b.name}
        </button>
      `;
    }).join('');

    filterContainer.innerHTML = html;

    // Attach click events to filters
    document.getElementById('filter-all-btn').onclick = () => {
      window.appState.navigate(this.searchQuery ? `/?q=${encodeURIComponent(this.searchQuery)}` : '/');
    };

    filterContainer.querySelectorAll('.filter-board-btn').forEach(btn => {
      btn.onclick = () => {
        const boardId = btn.dataset.id;
        let url = `/?boardId=${boardId}`;
        if (this.searchQuery) url += `&q=${encodeURIComponent(this.searchQuery)}`;
        window.appState.navigate(url);
      };
    });
  },

  renderGrid: function() {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;

    gridContainer.innerHTML = renderMasonryGrid(this.images, this.hasMore);

    // Setup Grid event listeners (Clicks & Likes)
    const gridEl = document.getElementById('gallery-masonry-grid');
    if (gridEl) {
      setupGridEvents(
        gridEl,
        (pinId) => {
          // Open lightbox by adding pin parameter to path URL query
          const currentPath = window.location.pathname;
          const currentSearch = window.location.search;
          const connector = currentSearch.includes('?') ? '&' : '?';
          window.appState.navigate(`${currentPath}${currentSearch}${connector}pin=${pinId}`);
        },
        async (pinId, likeBtn) => {
          // Fire like trigger
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
    let url = '/';
    if (query) url += `?q=${encodeURIComponent(query)}`;
    if (this.selectedBoardId) {
      url += (query ? '&' : '?') + `boardId=${this.selectedBoardId}`;
    }
    window.appState.navigate(url);
  }
};
