const mongoose = require('mongoose');
const fuzzySearch = require('../index');

describe('Equality Predicate Tests', () => {
  let TestModel;
  let testDocs;

  beforeAll(async () => {
    const schema = new mongoose.Schema({
      name: String,
      category: String,
      organization: String,
      tags: [String]
    });

    schema.plugin(fuzzySearch, {
      fields: ['name'],
      equalityPredicate: { category: 1 }
    });

    TestModel = mongoose.model('EqualityTest', schema);

    // Create test documents with different categories
    testDocs = await TestModel.create([
      {
        name: 'JavaScript Programming',
        category: 'Programming',
        organization: 'Org1',
        tags: ['javascript', 'programming']
      },
      {
        name: 'Python Programming',
        category: 'Programming',
        organization: 'Org2',
        tags: ['python', 'programming']
      },
      {
        name: 'Web Development',
        category: 'Web',
        organization: 'Org1',
        tags: ['web', 'development']
      },
      {
        name: 'Data Science',
        category: 'Data',
        organization: 'Org2',
        tags: ['data', 'science']
      }
    ]);
  });

  afterAll(async () => {
    await TestModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Basic Functionality', () => {
    it('should filter results by category before fuzzy search', async () => {
      const results = await TestModel.fuzzySearch('programming', { category: 'Programming' });
      expect(results).toHaveLength(2);
      expect(results.every(doc => doc.category === 'Programming')).toBeTruthy();
    });

    it('should return empty array when category filter has no matches', async () => {
      const results = await TestModel.fuzzySearch('programming', { category: 'Nonexistent' });
      expect(results).toHaveLength(0);
    });

    it('should work with partial matches in fuzzy search', async () => {
      const results = await TestModel.fuzzySearch('prog', { category: 'Programming' });
      expect(results).toHaveLength(2);
      expect(results.every(doc => doc.category === 'Programming')).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should throw error when equalityPredicate has more than one field', () => {
      const schema = new mongoose.Schema({ name: String });
      expect(() => {
        schema.plugin(fuzzySearch, {
          fields: ['name'],
          equalityPredicate: { category: 1, organization: 1 }
        });
      }).toThrow('Equality filter can have only one filter');
    });

    it('should accept valid equalityPredicate configuration', () => {
      const schema = new mongoose.Schema({ name: String });
      expect(() => {
        schema.plugin(fuzzySearch, {
          fields: ['name'],
          equalityPredicate: { category: 1 }
        });
      }).not.toThrow();
    });
  });

  describe('Integration with Fuzzy Search', () => {
    it('should combine equality predicate with other query options', async () => {
      const results = await TestModel.fuzzySearch('programming', { 
        category: 'Programming',
        organization: 'Org1'
      });
      expect(results).toHaveLength(1);
      expect(results[0].organization).toBe('Org1');
      expect(results[0].category).toBe('Programming');
    });

    it('should maintain fuzzy search relevance scores', async () => {
      const results = await TestModel.fuzzySearch('programming', { category: 'Programming' });
      expect(results[0].confidenceScore).toBeDefined();
      expect(results[0].confidenceScore).toBeGreaterThan(0);
    });
  });

  describe('Performance Verification', () => {
    it('should execute faster with equality predicate', async () => {
      const startTimeWithPredicate = Date.now();
      await TestModel.fuzzySearch('programming', { category: 'Programming' });
      const timeWithPredicate = Date.now() - startTimeWithPredicate;

      const startTimeWithoutPredicate = Date.now();
      await TestModel.fuzzySearch('programming');
      const timeWithoutPredicate = Date.now() - startTimeWithoutPredicate;

      // The time with predicate should be significantly less
      expect(timeWithPredicate).toBeLessThan(timeWithoutPredicate);
    });
  });

  describe('Error Cases', () => {
    it('should handle non-existent category gracefully', async () => {
      const results = await TestModel.fuzzySearch('programming', { category: 'InvalidCategory' });
      expect(results).toHaveLength(0);
    });

    it('should handle empty search string with equality predicate', async () => {
      const results = await TestModel.fuzzySearch('', { category: 'Programming' });
      expect(results).toHaveLength(2);
      expect(results.every(doc => doc.category === 'Programming')).toBeTruthy();
    });
  });
}); 