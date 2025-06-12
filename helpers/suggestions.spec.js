const SearchSuggestions = require('./suggestions');

describe('SearchSuggestions', () => {
  let suggestions;
  const testDocuments = [
    { title: 'JavaScript Programming', description: 'Learn JavaScript' },
    { title: 'Python Programming', description: 'Learn Python' },
    { title: 'Java Programming', description: 'Learn Java' },
    { title: 'Web Development', description: 'Learn HTML, CSS, and JavaScript' }
  ];

  beforeEach(() => {
    suggestions = new SearchSuggestions({
      minSize: 2,
      prefixOnly: true,
      maxSuggestions: 3,
      minScore: 0.5
    });
  });

  describe('generateSuggestions', () => {
    it('should return empty array for empty query', () => {
      const result = suggestions.generateSuggestions('', testDocuments, ['title']);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty documents', () => {
      const result = suggestions.generateSuggestions('prog', [], ['title']);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty fields', () => {
      const result = suggestions.generateSuggestions('prog', testDocuments, []);
      expect(result).toHaveLength(0);
    });

    it('should generate suggestions based on title field', () => {
      const result = suggestions.generateSuggestions('prog', testDocuments, ['title']);
      
      expect(result).toHaveLength(3);
      expect(result[0].suggestion).toBe('JavaScript Programming');
      expect(result[1].suggestion).toBe('Python Programming');
      expect(result[2].suggestion).toBe('Java Programming');
      expect(result[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it('should generate suggestions based on multiple fields', () => {
      const result = suggestions.generateSuggestions('learn', testDocuments, ['title', 'description']);
      
      expect(result).toHaveLength(3);
      expect(result[0].suggestion).toBe('Web Development');
      expect(result[1].suggestion).toBe('JavaScript Programming');
      expect(result[2].suggestion).toBe('Python Programming');
    });

    it('should respect maxSuggestions limit', () => {
      suggestions = new SearchSuggestions({ maxSuggestions: 2 });
      const result = suggestions.generateSuggestions('prog', testDocuments, ['title']);
      
      expect(result).toHaveLength(2);
    });

    it('should respect minScore threshold', () => {
      suggestions = new SearchSuggestions({ minScore: 0.8 });
      const result = suggestions.generateSuggestions('xyz', testDocuments, ['title']);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateScore', () => {
    it('should return 0 for empty n-grams', () => {
      const score = suggestions.calculateScore([], ['test']);
      expect(score).toBe(0);
    });

    it('should return 0 for no matches', () => {
      const score = suggestions.calculateScore(['abc'], ['def']);
      expect(score).toBe(0);
    });

    it('should return 1 for perfect match', () => {
      const score = suggestions.calculateScore(['test'], ['test']);
      expect(score).toBe(1);
    });

    it('should return partial score for partial match', () => {
      const score = suggestions.calculateScore(['test', 'ing'], ['test']);
      expect(score).toBe(0.5);
    });
  });

  describe('updateSettings', () => {
    it('should update minSize', () => {
      suggestions.updateSettings({ minSize: 3 });
      expect(suggestions.minSize).toBe(3);
    });

    it('should update prefixOnly', () => {
      suggestions.updateSettings({ prefixOnly: false });
      expect(suggestions.prefixOnly).toBe(false);
    });

    it('should update maxSuggestions', () => {
      suggestions.updateSettings({ maxSuggestions: 5 });
      expect(suggestions.maxSuggestions).toBe(5);
    });

    it('should update minScore', () => {
      suggestions.updateSettings({ minScore: 0.7 });
      expect(suggestions.minScore).toBe(0.7);
    });

    it('should not update undefined settings', () => {
      const originalMinSize = suggestions.minSize;
      suggestions.updateSettings({});
      expect(suggestions.minSize).toBe(originalMinSize);
    });
  });
}); 