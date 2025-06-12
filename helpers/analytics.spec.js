const SearchAnalytics = require('./analytics');
const { validAnalytics } = require('./config');

describe('SearchAnalytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new SearchAnalytics();
  });

  describe('recordSearch', () => {
    it('should record successful search with results', () => {
      analytics.recordSearch('test query', 5, 100);
      const data = analytics.getAnalytics();
      
      expect(data.searchCount).toBe(1);
      expect(data.resultCount).toBe(5);
      expect(data.responseTime).toHaveLength(1);
      expect(data.responseTime[0]).toBe(100);
      expect(data.popularSearches).toHaveLength(1);
      expect(data.popularSearches[0][0]).toBe('test query');
      expect(data.popularSearches[0][1]).toBe(1);
    });

    it('should record failed search', () => {
      analytics.recordSearch('test query', 0, 100, false);
      const data = analytics.getAnalytics();
      
      expect(data.searchCount).toBe(1);
      expect(data.resultCount).toBe(0);
      expect(data.failedSearches).toHaveLength(1);
      expect(data.failedSearches[0][0]).toBe('test query');
      expect(data.failedSearches[0][1]).toBe(1);
    });

    it('should aggregate multiple searches', () => {
      analytics.recordSearch('query1', 3, 100);
      analytics.recordSearch('query1', 2, 150);
      analytics.recordSearch('query2', 1, 200);
      
      const data = analytics.getAnalytics();
      
      expect(data.searchCount).toBe(3);
      expect(data.resultCount).toBe(6);
      expect(data.responseTime).toHaveLength(3);
      expect(data.popularSearches).toHaveLength(2);
      expect(data.popularSearches[0][0]).toBe('query1');
      expect(data.popularSearches[0][1]).toBe(2);
    });
  });

  describe('getAnalytics', () => {
    beforeEach(() => {
      analytics.recordSearch('test1', 2, 100);
      analytics.recordSearch('test2', 3, 150);
      analytics.recordSearch('test1', 1, 200, false);
    });

    it('should return all metrics by default', () => {
      const data = analytics.getAnalytics();
      
      expect(data).toHaveProperty('searchCount');
      expect(data).toHaveProperty('resultCount');
      expect(data).toHaveProperty('responseTime');
      expect(data).toHaveProperty('popularSearches');
      expect(data).toHaveProperty('failedSearches');
    });

    it('should return only requested metrics', () => {
      const data = analytics.getAnalytics(['searchCount', 'resultCount']);
      
      expect(data).toHaveProperty('searchCount');
      expect(data).toHaveProperty('resultCount');
      expect(data).not.toHaveProperty('responseTime');
      expect(data).not.toHaveProperty('popularSearches');
      expect(data).not.toHaveProperty('failedSearches');
    });

    it('should calculate response time statistics correctly', () => {
      const data = analytics.getAnalytics(['responseTime']);
      
      expect(data.responseTime).toHaveProperty('avg');
      expect(data.responseTime).toHaveProperty('min');
      expect(data.responseTime).toHaveProperty('max');
      expect(data.responseTime.avg).toBe(150);
      expect(data.responseTime.min).toBe(100);
      expect(data.responseTime.max).toBe(200);
    });

    it('should sort popular searches by count', () => {
      const data = analytics.getAnalytics(['popularSearches']);
      
      expect(data.popularSearches[0][0]).toBe('test1');
      expect(data.popularSearches[0][1]).toBe(2);
      expect(data.popularSearches[1][0]).toBe('test2');
      expect(data.popularSearches[1][1]).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all analytics data', () => {
      analytics.recordSearch('test', 5, 100);
      analytics.reset();
      
      const data = analytics.getAnalytics();
      
      expect(data.searchCount).toBe(0);
      expect(data.resultCount).toBe(0);
      expect(data.responseTime).toHaveLength(0);
      expect(data.popularSearches).toHaveLength(0);
      expect(data.failedSearches).toHaveLength(0);
    });
  });
}); 