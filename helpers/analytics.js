const { validAnalytics } = require('./config');

class SearchAnalytics {
  constructor() {
    this.analytics = {
      searchCount: 0,
      resultCount: 0,
      responseTime: [],
      popularSearches: new Map(),
      failedSearches: new Map()
    };
  }

  /**
   * Record a search operation
   * @param {string} query - Search query
   * @param {number} resultCount - Number of results
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether the search was successful
   */
  recordSearch(query, resultCount, responseTime, success = true) {
    this.analytics.searchCount++;
    this.analytics.resultCount += resultCount;
    this.analytics.responseTime.push(responseTime);

    // Update popular searches
    const currentCount = this.analytics.popularSearches.get(query) || 0;
    this.analytics.popularSearches.set(query, currentCount + 1);

    // Record failed searches
    if (!success) {
      const failedCount = this.analytics.failedSearches.get(query) || 0;
      this.analytics.failedSearches.set(query, failedCount + 1);
    }
  }

  /**
   * Get analytics data
   * @param {string[]} metrics - Metrics to retrieve
   * @returns {Object} Analytics data
   */
  getAnalytics(metrics = validAnalytics) {
    const result = {};

    if (metrics.includes('searchCount')) {
      result.searchCount = this.analytics.searchCount;
    }

    if (metrics.includes('resultCount')) {
      result.resultCount = this.analytics.resultCount;
    }

    if (metrics.includes('responseTime')) {
      const times = this.analytics.responseTime;
      result.responseTime = {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    }

    if (metrics.includes('popularSearches')) {
      result.popularSearches = Array.from(this.analytics.popularSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }

    if (metrics.includes('failedSearches')) {
      result.failedSearches = Array.from(this.analytics.failedSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }

    return result;
  }

  /**
   * Reset analytics data
   */
  reset() {
    this.analytics = {
      searchCount: 0,
      resultCount: 0,
      responseTime: [],
      popularSearches: new Map(),
      failedSearches: new Map()
    };
  }
}

module.exports = SearchAnalytics; 