const mongoose = require('mongoose');
const fuzzySearch = require('./index');
const db = require('./__tests__/support/db');
const { validMiddlewares } = require('./helpers/config');

describe('FuzzySearch Plugin', () => {
  let TestModel;
  let testDocs;

  beforeAll(async () => {
    await db.openConnection();

    const schema = new mongoose.Schema({
      title: String,
      description: String,
      tags: [String]
    });

    schema.plugin(fuzzySearch, {
      fields: [{
        name: 'title',
        weight: 2,
        config: {
          minSize: 3,
          prefixOnly: true
        }
      }, {
        name: 'description',
        weight: 1,
        config: {
          minSize: 2,
          prefixOnly: false
        }
      }],
      analytics: true,
      suggestions: {
        maxSuggestions: 3,
        minScore: 0.5
      }
    });

    TestModel = mongoose.model('Test', schema);
    await TestModel.init();

    testDocs = await TestModel.create([
      {
        title: 'JavaScript Programming',
        description: 'Learn JavaScript programming language',
        tags: ['javascript', 'programming']
      },
      {
        title: 'Python Programming',
        description: 'Learn Python programming language',
        tags: ['python', 'programming']
      },
      {
        title: 'Web Development',
        description: 'Learn HTML, CSS, and JavaScript',
        tags: ['web', 'development']
      }
    ]);
  });

  afterAll(async () => {
    await TestModel.deleteMany({});
    await db.closeConnection();
  });

  describe('Field-specific weights and configuration', () => {
    it('should respect field weights in search results', async () => {
      const results = await TestModel.fuzzySearch('programming');

      // Both programming docs match (in title, weight: 2, and description,
      // weight: 1); the non-programming doc is excluded.
      expect(results).toHaveLength(2);
      const titles = results.map((result) => result.title);
      expect(titles).toContain('JavaScript Programming');
      expect(titles).toContain('Python Programming');
    });

    it('should respect field-specific minSize configuration', async () => {
      const results = await TestModel.fuzzySearch('pro');
      
      expect(results).toHaveLength(2);
      // Should match because title has minSize: 3
      expect(results[0].title).toContain('Programming');
    });

    it('should respect field-specific prefixOnly configuration', async () => {
      const results = await TestModel.fuzzySearch('script');

      // Titles are indexed with prefixOnly: true, so 'script' only matches the
      // descriptions (prefixOnly: false), i.e. the two documents mentioning
      // "JavaScript".
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.description).toContain('JavaScript');
      });
    });
  });

  describe('Analytics', () => {
    beforeEach(() => {
      TestModel.analytics.reset();
    });

    it('should record search analytics', async () => {
      await TestModel.fuzzySearch('programming');
      const analytics = await TestModel.getAnalytics([
        'searchCount',
        'resultCount',
        'responseTime',
        'popularSearches'
      ]);

      expect(analytics.searchCount).toBeGreaterThan(0);
      expect(analytics.resultCount).toBeGreaterThan(0);
      expect(analytics.responseTime).toHaveProperty('avg');
      expect(analytics.popularSearches).toHaveLength(1);
      expect(analytics.popularSearches[0][0]).toBe('programming');
    });

    it('should record failed searches', async () => {
      await TestModel.fuzzySearch('zzzzzz');
      const analytics = await TestModel.getAnalytics(['failedSearches']);

      expect(analytics.failedSearches).toHaveLength(1);
      expect(analytics.failedSearches[0][0]).toBe('zzzzzz');
    });
  });

  describe('Suggestions', () => {
    it('should generate suggestions based on partial query', async () => {
      const suggestions = await TestModel.getSuggestions('prog');

      // Two titles and two descriptions mention "programming"; capped at
      // maxSuggestions: 3, the highest-ranked suggestion is the title match.
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].suggestion).toBe('JavaScript Programming');
      expect(suggestions[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it('should respect maxSuggestions limit', async () => {
      const suggestions = await TestModel.getSuggestions('learn');
      
      expect(suggestions).toHaveLength(3);
    });
  });

  describe('Aggregation Pipeline', () => {
    it('should support aggregation pipeline', async () => {
      const results = await TestModel.fuzzySearchAggregate('programming', {
        pipeline: [
          { $match: { tags: 'javascript' } }
        ]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Programming');
    });

    it('should support custom fuzzy options', async () => {
      const results = await TestModel.fuzzySearchAggregate('progrming', {
        maxEdits: 2,
        prefixLength: 2
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('Programming');
    });

    it('should run only the provided pipeline when the query is empty', async () => {
      const results = await TestModel.fuzzySearchAggregate('', {
        pipeline: [{ $match: { title: 'Web Development' } }]
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Web Development');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid field configurations', () => {
      const schema = new mongoose.Schema({ title: String });
      
      expect(() => {
        schema.plugin(fuzzySearch, {
          fields: [{
            name: 'title',
            keys: ['title'],
            config: { invalidConfig: true }
          }]
        });
      }).toThrow('Invalid field configurations');
    });

    it('should throw error when analytics not enabled', async () => {
      const schema = new mongoose.Schema({ title: String });
      schema.plugin(fuzzySearch, { fields: [{ name: 'title', keys: ['title'] }] });
      const Model = mongoose.model('NoAnalytics', schema);
      
      await expect(Model.getAnalytics()).rejects.toThrow('Analytics are not enabled');
    });

    it('should throw error when suggestions not enabled', async () => {
      const schema = new mongoose.Schema({ title: String });
      schema.plugin(fuzzySearch, { fields: [{ name: 'title', keys: ['title'] }] });
      const Model = mongoose.model('NoSuggestions', schema);
      
      await expect(Model.getSuggestions('test')).rejects.toThrow('Suggestions are not enabled');
    });
  });
});

describe('fuzzy search', () => {
  const schema = {
    add: () => {},
    index: () => {},
    set: () => {},
    pre: () => {},
    statics: [],
  };

  it('should throw an Error when the options attribute is undefined', () => {
    expect(fuzzySearch.bind(this)).toThrow('You must set at least one field for fuzzy search.');
  });

  it('should throw an Error when the fields option is undefined', () => {
    expect(fuzzySearch.bind(this, schema, {})).toThrow(
      'You must set at least one field for fuzzy search.',
    );
  });

  it('should throw an TypeError when the fields option is not an array', () => {
    expect(fuzzySearch.bind(this, schema, { fields: '123' })).toThrow('Fields must be an array');
  });

  it('should return TypeError when keys is not a String or an Array', () => {
    expect(
      fuzzySearch.bind(this, schema, {
        fields: [
          {
            keys: () => {},
          },
        ],
      }),
    ).toThrow('Key must be an array or a string.');
  });

  it('should return TypeError when middlewares are not an Object', () => {
    expect(
      fuzzySearch.bind(this, schema, {
        fields: ['name'],
        middlewares: [1, 2, 3],
      }),
    ).toThrow('Middlewares must be an object.');
  });

  it('should return TypeError when a middleware is not a function', () => {
    expect(
      fuzzySearch.bind(this, schema, {
        fields: ['name'],
        middlewares: {
          preSave: () => {},
          preUpdate: 'test',
        },
      }),
    ).toThrow('Middleware must be a Function.');
  });

  it('should return TypeError when a middleware key is invalid', () => {
    expect(
      fuzzySearch.bind(this, schema, {
        fields: ['name'],
        middlewares: {
          preSave: () => {},
          somethingElse: () => {},
        },
      }),
    ).toThrow(`Middleware key should be one of: [${validMiddlewares.join(', ')}].`);
  });
});
