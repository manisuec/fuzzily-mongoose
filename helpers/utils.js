/**
 * Removes special symbols from string.
 * @param {string} text - The string to remove the characters.
 * @param {boolean} escapeSpecialCharacters - If this value is true, it will also remove all the special characters.
 * @return {string} the given text without the special characters.
 */
const replaceSymbols = (replaceLanguageCharacters) => (text, escapeSpecialCharacters) => {
  if (!text) {
    return '';
  }

  let processedText = text.toLowerCase();

  if (escapeSpecialCharacters) {
    // Remove special characters except spaces and underscores
    processedText = processedText.replace(/[!"#%&'()*+,-./:;<=>?@[\\\]^`{|}~]/g, '');
  }

  // Replace underscores with spaces
  processedText = processedText.replace(/_/g, ' ');

  // Apply language-specific character replacements
  return replaceLanguageCharacters(processedText);
};

/**
 * Returns if the variable is an object and if the the object is empty
 * @param {any} obj
 * @return {boolean}
 */
const isObject = (obj) => {
  return obj !== null && 
         typeof obj === 'object' && 
         !Array.isArray(obj) && 
         Object.keys(obj).length > 0;
};

/**
 * Returns if the variable is a Function
 * @param {any} fn
 * @return {boolean}
 */
const isFunction = (fn) => {
  return typeof fn === 'function' || 
         (fn && typeof fn === 'object' && fn.constructor === Function);
};

const isString = (input) => {
  return typeof input === 'string' || 
         (input && typeof input === 'object' && input.constructor === String);
};

module.exports = {
  replaceSymbols,
  isObject,
  isFunction,
  isString,
};
