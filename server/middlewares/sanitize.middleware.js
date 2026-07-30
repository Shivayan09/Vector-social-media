/**
 * Input sanitization middleware to prevent XSS attacks
 *
 * Sanitizes user-generated content (posts, comments, bios, etc.)
 * to remove potentially dangerous HTML and script tags.
 *
 * Works in conjunction with Content Security Policy headers
 * to provide defense-in-depth XSS protection.
 */

import { createRequire } from "module";

// isomorphic-dompurify eagerly spins up a JSDOM window the moment it is
// imported. Loading it at module scope means every file that imports the app
// (including unit test suites that never sanitize anything) pays that cost and,
// under Jest, JSDOM's deferred internal requires can fire after the test
// environment is torn down. We defer the require to first use instead, so JSDOM
// only initializes inside a live request and never at import time.
const require = createRequire(import.meta.url);
let domPurify = null;
const getDOMPurify = () => {
  if (!domPurify) {
    domPurify = require("isomorphic-dompurify");
  }
  return domPurify;
};

/**
 * Configure DOMPurify with strict settings
 * Removes all HTML tags and only allows safe text content
 */
const purifyConfig = {
  // Remove all HTML tags, keeping only text content
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,

  // Additional security settings
  FORCE_BODY: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
};

/**
 * Sanitize a single string value
 * Removes all HTML and keeps only plain text
 *
 * @param {string} value - The string to sanitize
 * @param {number} maxLength - Maximum length of sanitized output
 * @returns {string} Sanitized text
 */
export const sanitizeText = (value, maxLength = 10000) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  // First pass: Remove script tags and event handlers
  let cleaned = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove <script> blocks
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove inline event handlers
    .replace(/on\w+\s*=\s*[^\s>]*/gi, ""); // Remove event handlers without quotes

  // Second pass: Use DOMPurify for comprehensive sanitization
  cleaned = getDOMPurify().sanitize(cleaned, purifyConfig);

  // Third pass: Remove any remaining control characters
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, "");

  // Trim and enforce max length
  return cleaned.trim().slice(0, maxLength);
};

/**
 * Sanitize an object's text fields recursively
 *
 * @param {object} obj - The object to sanitize
 * @param {array} fieldsToSanitize - Fields that contain user text
 * @returns {object} Object with sanitized text fields
 */
export const sanitizeObject = (obj, fieldsToSanitize = []) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sanitized = { ...obj };

  fieldsToSanitize.forEach((field) => {
    if (sanitized[field] && typeof sanitized[field] === "string") {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  });

  return sanitized;
};

/**
 * Middleware to sanitize specific request body fields
 *
 * @param {array} fieldsToSanitize - List of fields to sanitize
 * @returns {function} Express middleware function
 */
export const sanitizeBodyFields = (fieldsToSanitize = []) => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== "object") {
      return next();
    }

    fieldsToSanitize.forEach((field) => {
      if (req.body[field] && typeof req.body[field] === "string") {
        req.body[field] = sanitizeText(req.body[field]);
      }
    });

    next();
  };
};

/**
 * Middleware to sanitize query parameters
 *
 * @param {array} fieldsToSanitize - List of fields to sanitize
 * @returns {function} Express middleware function
 */
export const sanitizeQueryFields = (fieldsToSanitize = []) => {
  return (req, res, next) => {
    if (!req.query || typeof req.query !== "object") {
      return next();
    }

    fieldsToSanitize.forEach((field) => {
      if (req.query[field] && typeof req.query[field] === "string") {
        req.query[field] = sanitizeText(req.query[field]);
      }
    });

    next();
  };
};

/**
 * Middleware to sanitize all text-like fields in request body
 * This is a blanket approach - use sanitizeBodyFields for fine-grained control
 *
 * @returns {function} Express middleware function
 */
export const sanitizeAllBodyFields = () => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== "object") {
      return next();
    }

    const sanitizeRecursive = (obj) => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];

        if (typeof value === "string") {
          // Sanitize all string values
          obj[key] = sanitizeText(value);
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          // Recursively sanitize nested objects
          sanitizeRecursive(value);
        } else if (Array.isArray(value)) {
          // Sanitize array items
          value.forEach((item, index) => {
            if (typeof item === "string") {
              value[index] = sanitizeText(item);
            } else if (item && typeof item === "object") {
              sanitizeRecursive(item);
            }
          });
        }
      });
    };

    sanitizeRecursive(req.body);
    next();
  };
};

export default {
  sanitizeText,
  sanitizeObject,
  sanitizeBodyFields,
  sanitizeQueryFields,
  sanitizeAllBodyFields,
};
