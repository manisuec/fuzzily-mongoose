/**
 * Reusable constant values
 * @typedef {Object} constants
 * @property {number} DEFAULT_MIN_SIZE - Default min size for anagrams.
 * @property {boolean} DEFAULT_PREFIX_ONLY - Whether return ngrams from start of word or not
 * @property {Object} DEFAULT_WEIGHTS - Default weights for search fields
 * @property {Object} DEFAULT_FIELD_CONFIG - Default configuration for search fields
 */

module.exports = {
  DEFAULT_MIN_SIZE: 2,
  DEFAULT_PREFIX_ONLY: false,
  DEFAULT_WEIGHTS: {
    exact: 10,
    prefix: 5,
    fuzzy: 1
  },
  DEFAULT_FIELD_CONFIG: {
    minSize: 2,
    prefixOnly: false,
    weight: 1,
    usePhonetic: false,
    useStemming: false,
    language: 'en'
  },
  validMiddlewares: [
    'preSave',
    'preUpdate',
    'preFindOneAndUpdate',
    'preInsertMany',
    'preUpdateMany',
    'preUpdateOne',
  ],
  validFieldConfigs: [
    'minSize',
    'prefixOnly',
    'weight',
    'usePhonetic',
    'useStemming',
    'language',
    'suggestions'
  ],
  validAnalytics: [
    'searchCount',
    'resultCount',
    'responseTime',
    'popularSearches',
    'failedSearches'
  ]
};
