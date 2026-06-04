const mongoose = require('mongoose');
const fuzzySearch = require('../index');
const db = require('../__tests__/support/db');

describe('Equality Predicate Tests', () => {
  let TestModel;
  let testDocs;

  beforeAll(async () => {
    await db.openConnection();

    const schema = new mongoose.Schema({
      name: String,
      category: String,
      organization: String,
      tags: [String]
    });

    schema.plugin(fuzzySearch, {
      fields: ['name'],
      equalityPredicate: { category: 1 },
      analytics: true
    });

    TestModel = mongoose.model('EqualityTest', schema);
    await TestModel.init();

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
    await db.closeConnection();
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
      expect(results[0].get('confidenceScore')).toBeDefined();
      expect(results[0].get('confidenceScore')).toBeGreaterThan(0);
    });
  });

  describe('Index Requirements', () => {
    it('should require the equality predicate for the compound text index', async () => {
      const results = await TestModel.fuzzySearch('programming', { category: 'Programming' });
      expect(results).toHaveLength(2);

      // The compound text index is prefixed by the equality field, so MongoDB
      // rejects a `$text` search that does not constrain that field.
      await expect(TestModel.fuzzySearch('programming')).rejects.toThrow();
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