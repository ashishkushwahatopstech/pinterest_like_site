// --- CLIENT-SIDE BEHAVIOR MODELING & RECOMMENDATION ENGINE ---

const COOKIE_NAME = 'pingrid_interests';
const MAX_KEYWORDS = 50; // Cap to keep cookie size small

const STOP_WORDS = new Set([
  'the', 'a', 'and', 'is', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'an', 'this', 'that', 'from', 'it', 'my', 'your', 'our', 'their', 'or', 'as', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'not'
]);

// Helper to set cookie
const setCookie = (name, value, days = 30) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=/; SameSite=Lax";
};

// Helper to get cookie
const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

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
  return getCookie(COOKIE_NAME) || {};
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

  // Sort and keep top N keywords to avoid bloated cookies
  const sorted = Object.entries(interests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS);

  const newInterests = {};
  sorted.forEach(([kw, val]) => {
    if (val > 0.1) { // Prune negligible weights
      newInterests[kw] = parseFloat(val.toFixed(2));
    }
  });

  setCookie(COOKIE_NAME, newInterests);
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

// Sort feed images based on user interests + recency boost
export const sortRecommendedFeed = (images) => {
  if (!images || images.length === 0) return [];
  const interests = getUserInterests();

  const scored = images.map(img => {
    let score = 0;
    const text = `${img.title || ''} ${img.description || ''} ${img.boards?.name || ''}`;
    const keywords = extractKeywords(text);

    keywords.forEach(kw => {
      if (interests[kw]) {
        score += interests[kw];
      }
    });

    // Recency booster: newer images get a slight push to keep the feed fresh
    const ageInHours = (Date.now() - new Date(img.created_at).getTime()) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 8 - (ageInHours / 48)); // Boost up to 8 points, decays over 16 days
    score += recencyBoost;

    // Apply +/- 15% random variance to prevent repetitive layouts and encourage exploration
    const variance = 0.85 + (Math.random() * 0.3);
    const finalScore = score * variance;

    return { ...img, recScore: finalScore };
  });

  return scored.sort((a, b) => b.recScore - a.recScore);
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
