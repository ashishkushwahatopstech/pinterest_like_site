// Helper functions to generate beautiful skeleton loading placeholders

export const renderPinSkeleton = (count = 10) => {
  let html = '';
  for (let i = 0; i < count; i++) {
    // Random height to simulate masonry variation
    const heights = [200, 280, 320, 240, 360, 180, 400];
    const height = heights[i % heights.length];
    
    html += `
      <div class="masonry-item">
        <div class="pin-card" style="cursor: default; pointer-events: none;">
          <div class="skeleton" style="width: 100%; height: ${height}px; border-radius: 0;"></div>
          <div style="padding: 16px;">
            <div class="skeleton skeleton-text" style="width: 70%;"></div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
              <div class="skeleton skeleton-avatar"></div>
              <div class="skeleton skeleton-text" style="width: 40%; margin-bottom: 0;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return html;
};

export const renderBoardSkeleton = (count = 4) => {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; min-height: 150px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="skeleton skeleton-text" style="width: 60%; height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-text" style="width: 40%; height: 14px;"></div>
        </div>
        <div class="skeleton skeleton-text" style="width: 30%; height: 12px; margin-bottom: 0; align-self: flex-end;"></div>
      </div>
    `;
  }
  return html;
};

export const renderProfileSkeleton = () => {
  return `
    <div class="profile-header">
      <div class="skeleton skeleton-avatar" style="width: 100px; height: 100px;"></div>
      <div class="skeleton skeleton-text" style="width: 150px; height: 28px; margin: 12px auto;"></div>
      <div class="skeleton skeleton-text" style="width: 250px; height: 16px; margin: 0 auto 20px;"></div>
      <div class="profile-stats">
        <div class="skeleton skeleton-text" style="width: 60px; height: 35px;"></div>
        <div class="skeleton skeleton-text" style="width: 60px; height: 35px;"></div>
      </div>
    </div>
  `;
};

export const renderAdminSkeleton = () => {
  return `
    <div class="admin-grid" style="margin-bottom: 32px;">
      <div class="skeleton glass" style="height: 110px;"></div>
      <div class="skeleton glass" style="height: 110px;"></div>
      <div class="skeleton glass" style="height: 110px;"></div>
      <div class="skeleton glass" style="height: 110px;"></div>
    </div>
    <div class="admin-layout">
      <div class="glass" style="padding: 24px; border-radius: var(--radius-md);">
        <div class="skeleton skeleton-text" style="width: 30%; height: 24px; margin-bottom: 24px;"></div>
        <div class="skeleton skeleton-text" style="width: 100%; height: 40px; margin-bottom: 12px;"></div>
        <div class="skeleton skeleton-text" style="width: 100%; height: 40px; margin-bottom: 12px;"></div>
        <div class="skeleton skeleton-text" style="width: 100%; height: 40px;"></div>
      </div>
      <div class="glass" style="padding: 24px; border-radius: var(--radius-md);">
        <div class="skeleton skeleton-text" style="width: 40%; height: 24px; margin-bottom: 24px;"></div>
        <div class="skeleton skeleton-text" style="width: 100%; height: 200px;"></div>
      </div>
    </div>
  `;
};
