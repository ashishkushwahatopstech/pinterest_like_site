/**
 * Privacy & Access Control Utility
 * Handles visibility modes:
 * - Public: is_public = true
 * - Unlisted (Link Access Allowed): is_public = false + contains [allow_link_access] in description
 * - Strictly Private (Owner Only): is_public = false, no link access
 */

export const LINK_ACCESS_TAG = '[allow_link_access]';

/**
 * Checks if a board or image record allows direct link access.
 */
export const isLinkAccessAllowed = (record) => {
  if (!record) return false;
  if (record.is_public) return true;
  const desc = record.description || '';
  return desc.includes(LINK_ACCESS_TAG) || desc.includes('[unlisted]');
};

/**
 * Checks if the current user has permission to access a board or image.
 * @param {Object} record - Board or Image object
 * @param {Object|null} currentUser - Active user object from appState
 * @param {boolean} isAdmin - Admin status from appState
 * @returns {boolean} True if user is authorized to view
 */
export const canUserAccessRecord = (record, currentUser, isAdmin) => {
  if (!record) return false;

  // 1. If public -> allowed for everyone
  if (record.is_public) return true;

  // 2. If user is owner or admin -> allowed
  const uid = currentUser ? currentUser.uid : null;
  if (uid && record.user_id === uid) return true;
  if (isAdmin) return true;

  // 3. If unlisted (allow_link_access enabled) -> allowed via direct URL
  if (isLinkAccessAllowed(record)) return true;

  // 4. Strictly private -> access denied
  return false;
};

/**
 * Strips privacy tags from description for user-facing display.
 */
export const getCleanDescription = (description) => {
  if (!description) return '';
  return description.replace(/\[allow_link_access\]/gi, '').replace(/\[unlisted\]/gi, '').trim();
};

/**
 * Formats description string with or without link access tag.
 */
export const formatDescriptionWithPrivacy = (cleanDescription, allowLinkAccess) => {
  const base = (cleanDescription || '').replace(/\[allow_link_access\]/gi, '').replace(/\[unlisted\]/gi, '').trim();
  if (allowLinkAccess) {
    return base ? `${base} ${LINK_ACCESS_TAG}` : LINK_ACCESS_TAG;
  }
  return base;
};
