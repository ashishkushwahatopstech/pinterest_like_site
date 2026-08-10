// --- CLIENT-SIDE BEHAVIOR MODELING & RECOMMENDATION ENGINE ---

const STORAGE_KEY = 'pingrid_interests';
const MAX_KEYWORDS = 20; // Cap to keep storage tiny and focused

const STOP_WORDS = new Set([
  'the', 'a', 'and', 'is', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'an', 'this', 'that', 'from', 'it', 'my', 'your', 'our', 'their', 'or', 'as', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'not'
]);

// Extract relevant keywords from text
export const extractKeywords = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
};

// Retrieve user interest weights
export const getUserInterests = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// Add weights to keywords, capping the list and decaying older interests slightly
const updateInterests = (keywords, weight) => {
  const interests = getUserInterests();
  
  // Apply a tiny decay (0.95x) to existing keywords to ensure new behavior takes priority over time
  Object.keys(interests).forEach(kw => {
    interests[kw] *= 0.95;
  });

  // Add new weights
  keywords.forEach(kw => {
    if (!kw) return;
    interests[kw] = (interests[kw] || 0) + weight;
  });

  // Sort and keep top N keywords to avoid bloated data
  const sorted = Object.entries(interests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS);

  const newInterests = {};
  sorted.forEach(([kw, val]) => {
    if (val > 0.1) { // Prune negligible weights
      newInterests[kw] = parseFloat(val.toFixed(2));
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newInterests));
  } catch (e) {
    console.error("Failed to write user interests to localStorage:", e);
  }
};

// --- PUBLIC TRACKING HOOKS ---

// Track a search query
export const trackUserSearch = (query) => {
  if (!query) return;
  const keywords = extractKeywords(query);
  updateInterests(keywords, 1.5);
};

// Track an image click / view
export const trackUserView = (image) => {
  if (!image) return;
  const text = `${image.title || ''} ${image.description || ''} ${image.boards?.name || ''}`;
  const keywords = extractKeywords(text);
  updateInterests(keywords, 2.0);
};

// Track an image like
export const trackUserLike = (image) => {
  if (!image) return;
  const text = `${image.title || ''} ${image.description || ''} ${image.boards?.name || ''}`;
  const keywords = extractKeywords(text);
  updateInterests(keywords, 5.0);
};

// --- SORTING & RECOMMENDATIONS ---

export const sortRecommendedFeed = (images) => {
  if (!images || images.length === 0) return [];

  // Keep original chronological / deterministic order intact to prevent layout shuffling
  return [...images].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
};

// Get contextual + user-interest recommendations for related grid below lightbox
export const getRelatedRecommendations = (targetImage, allImages) => {
  if (!targetImage || !allImages) return [];
  
  const targetText = `${targetImage.title || ''} ${targetImage.description || ''} ${targetImage.boards?.name || ''}`;
  const targetKeywords = extractKeywords(targetText);
  const interests = getUserInterests();

  const scored = allImages
    .filter(img => img.id !== targetImage.id) // Exclude current image
    .map(img => {
      let score = 0;
      const imgText = `${img.title || ''} ${img.description || ''} ${img.boards?.name || ''}`;
      const imgKeywords = extractKeywords(imgText);

      // 1. Same collection matches (highest priority signal)
      if (img.board_id === targetImage.board_id) {
        score += 20;
      }

      // 2. Metadata overlapping (similar subjects)
      imgKeywords.forEach(kw => {
        if (targetKeywords.includes(kw)) {
          score += 6;
        }
      });

      // 3. User interested keywords alignment (personal taste)
      imgKeywords.forEach(kw => {
        if (interests[kw]) {
          score += interests[kw] * 1.5;
        }
      });

      // Add variance
      const variance = 0.9 + (Math.random() * 0.2);
      const finalScore = score * variance;

      return { ...img, recScore: finalScore };
    });

  return scored
    .sort((a, b) => b.recScore - a.recScore)
    .map(item => {
      // Clean temporary score keys to preserve object purity
      const { recScore, ...cleanItem } = item;
      return cleanItem;
    });
};
