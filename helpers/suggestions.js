const config = require('./config');
const languageCharacters = require('./languageCharacters');
const { replaceSymbols } = require('./utils');
const { makeNGrams } = require('./ngrams');

const { DEFAULT_MIN_SIZE, DEFAULT_PREFIX_ONLY } = config;
const nGrams = makeNGrams(config, replaceSymbols(languageCharacters));

class SearchSuggestions {
  constructor(options = {}) {
    this.minSize = options.minSize || DEFAULT_MIN_SIZE;
    this.prefixOnly = options.prefixOnly || DEFAULT_PREFIX_ONLY;
    this.maxSuggestions = options.maxSuggestions || 10;
    this.minScore = options.minScore || 0.5;
  }

  /**
   * Generate suggestions based on a partial query
   * @param {string} query - Partial search query
   * @param {Array} documents - Array of documents to search in
   * @param {Array} fields - Fields to search in
   * @returns {Array} Array of suggestions with scores
   */
  generateSuggestions(query, documents, fields) {
    if (!query || !documents || !fields) {
      return [];
    }

    const queryNGrams = nGrams(query, false, this.minSize, this.prefixOnly);
    const suggestions = new Map();

    documents.forEach(doc => {
      fields.forEach(field => {
        const fieldValue = doc[field];
        if (!fieldValue) return;

        const fieldNGrams = nGrams(fieldValue, false, this.minSize, this.prefixOnly);
        const score = this.calculateScore(queryNGrams, fieldNGrams);

        if (score >= this.minScore) {
          const currentScore = suggestions.get(fieldValue) || 0;
          suggestions.set(fieldValue, Math.max(currentScore, score));
        }
      });
    });

    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxSuggestions)
      .map(([suggestion, score]) => ({
        suggestion,
        score
      }));
  }

  /**
   * Calculate similarity score between query and field n-grams
   * @param {Array} queryNGrams - Query n-grams
   * @param {Array} fieldNGrams - Field n-grams
   * @returns {number} Similarity score between 0 and 1
   */
  calculateScore(queryNGrams, fieldNGrams) {
    if (!queryNGrams.length || !fieldNGrams.length) {
      return 0;
    }

    const matches = queryNGrams.filter(ngram => 
      fieldNGrams.includes(ngram)
    ).length;

    return matches / queryNGrams.length;
  }

  /**
   * Update suggestion settings
   * @param {Object} options - New settings
   */
  updateSettings(options) {
    if (options.minSize) this.minSize = options.minSize;
    if (options.prefixOnly !== undefined) this.prefixOnly = options.prefixOnly;
    if (options.maxSuggestions) this.maxSuggestions = options.maxSuggestions;
    if (options.minScore) this.minScore = options.minScore;
  }
}

module.exports = SearchSuggestions; 