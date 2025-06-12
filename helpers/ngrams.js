const addWholePhrase = (arr, text) => {
  if (text.split(' ').length > 1) {
    return [...arr, text.toLowerCase()];
  }
  return arr;
};

/**
 * Creates sequence of characters taken from the given string.
 * @param {string} text - The string for the sequence.
 * @param {number} minSize - Lower limit to start creating sequence.
 * @param {boolean} prefixOnly -Only return ngrams from start of word.
 * @return {Array} The sequence of characters in Array of Strings.
 */
const nGrams = (constants) => (text, minSize, prefixOnly) => {
  if (minSize == null) {
    minSize = constants.DEFAULT_MIN_SIZE;
  }

  if (minSize <= 0) {
    throw new Error('minSize must be greater than 0.');
  }

  if (!text) {
    return [];
  }

  const normalizedText = text.slice ? text.toLowerCase() : String(text);
  
  if (normalizedText.length <= minSize) {
    return [];
  }

  const set = new Set();
  let index = prefixOnly ? 0 : normalizedText.length - minSize + 1;

  if (prefixOnly) {
    while (minSize < normalizedText.length + 1) {
      set.add(normalizedText.slice(index, index + minSize));
      minSize++;
    }
    return Array.from(set);
  }

  while (minSize <= normalizedText.length + 1) {
    if (index !== 0) {
      set.add(normalizedText.slice(--index, index + minSize));
    } else {
      minSize++;
      index = normalizedText.length - minSize + 1;
    }
  }

  return Array.from(set);
};

/**
 * Creates sequence of each word from the given string.
 * @param {string} text - The string for the sequence.
 * @param {boolean} escapeSpecialCharacters - Escape special characters from the given string.
 * @param {number} minSize - Lower limit to start creating sequence.
 * @param {boolean} prefixOnly -Only return ngrams from start of word.
 * @return {Array} The sequence of characters in Array of Strings.
 */
const makeNGrams = (constants, replaceSymbols) => (
  text,
  escapeSpecialCharacters,
  minSize,
  prefixOnly,
) => {
  if (!text) {
    return [];
  }

  const trimmedText = text.replace(/\s+/g, ' ').trim();
  if (!trimmedText) {
    return [];
  }

  const words = trimmedText.split(' ');
  const ngrams = words.flatMap((word) => {
    const processedWord = replaceSymbols(word, escapeSpecialCharacters);
    return nGrams(constants)(
      processedWord,
      minSize || constants.DEFAULT_MIN_SIZE,
      prefixOnly || constants.DEFAULT_PREFIX_ONLY,
    );
  });

  const uniqueNgrams = Array.from(new Set(ngrams));
  return addWholePhrase(uniqueNgrams, text);
};

module.exports = { nGrams, makeNGrams };
