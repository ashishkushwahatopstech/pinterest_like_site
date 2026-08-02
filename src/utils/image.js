/**
 * Image optimization utility to resize high-resolution cloud images (Google Drive, etc.)
 * into lightweight thumbnails for fast rendering and smooth 60fps/120fps scrolling.
 */

export const getOptimizedImageUrl = (url, width = 600) => {
  if (!url) return '';

  // Handle Google Drive / googleusercontent CDN links
  if (url.includes('googleusercontent.com') || url.includes('drive.google.com')) {
    // Strip existing size modifiers if any (e.g. =w800, =s600, =w1600, =w600-rw)
    const baseUrl = url.split('=')[0];
    return `${baseUrl}=w${width}`;
  }

  // Return original URL for other sources (e.g. Supabase fallback or external URLs)
  return url;
};
