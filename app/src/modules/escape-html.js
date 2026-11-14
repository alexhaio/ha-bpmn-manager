/**
 * HA-BPMN-Manager: HTML & URL Sanitization Helpers
 *
 * @package HA_BPMN_Manager
 */

/**
 * Escapes HTML special characters for safe interpolation into markup strings.
 *
 * @param {*} str Input value.
 * @return {string} Escaped string.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) {
    return '';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates a CSS hex color string.
 *
 * @param {*} color Color candidate.
 * @param {string} fallback Safe fallback hex color.
 * @return {string} Validated hex color.
 */
export function sanitizeHexColor(color, fallback = '#bf953f') {
  if (typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color.trim())) {
    return color.trim();
  }
  return fallback;
}

/**
 * Validates media image URLs (allows https, http, relative paths, or raster data URIs).
 *
 * @param {*} url Candidate URL.
 * @return {string} Safe URL or empty string.
 */
export function sanitizeMediaUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed) || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    return trimmed;
  }
  if (/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}
