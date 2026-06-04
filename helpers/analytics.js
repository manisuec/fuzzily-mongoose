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
   * Sort a Map of `query -> count` by descending count and cap the result.
   * @param {Map} searches
   * @returns {Array} Array of `[query, count]` entries
   */
  static topSearches(searches) {
    return Array.from(searches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  /**
   * Get analytics data.
   *
   * When called without `metrics`, the raw collected data is returned (with
   * `responseTime` as the list of recorded times). When specific `metrics` are
   * requested, `responseTime` is summarised into `{ avg, min, max }`.
   * @param {string[]} [metrics] - Metrics to retrieve
   * @returns {Object} Analytics data
   */
  getAnalytics(metrics) {
    if (!metrics) {
      return {
        searchCount: this.analytics.searchCount,
        resultCount: this.analytics.resultCount,
        responseTime: [...this.analytics.responseTime],
        popularSearches: SearchAnalytics.topSearches(this.analytics.popularSearches),
        failedSearches: SearchAnalytics.topSearches(this.analytics.failedSearches)
      };
    }

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
      result.popularSearches = SearchAnalytics.topSearches(this.analytics.popularSearches);
    }

    if (metrics.includes('failedSearches')) {
      result.failedSearches = SearchAnalytics.topSearches(this.analytics.failedSearches);
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