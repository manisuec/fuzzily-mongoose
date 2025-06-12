const {
  config: { DEFAULT_MIN_SIZE, DEFAULT_PREFIX_ONLY, DEFAULT_WEIGHTS, DEFAULT_FIELD_CONFIG, validMiddlewares, validFieldConfigs },
  createFields,
  createNGrams,
  isFunction,
  isObject,
  isString,
  removeFuzzyElements,
  setTransformers,
  nGrams,
} = require('./helpers');
const { Query } = require('mongoose');
const SearchAnalytics = require('./helpers/analytics');
const SearchSuggestions = require('./helpers/suggestions');

const parseArguments = (args, i1, i2) => {
  let options = {};
  let callback = null;

  if (args[i1] && isFunction(args[i1])) {
    callback = args[i1];
  } else if (args[i1] && isObject(args[i1])) {
    options = args[i1];
  }

  if (!callback && isFunction(args[i2])) {
    callback = args[i2];
  }

  return { options, callback };
};

const validateItem = (item) => {
  if (isObject(item) && item.keys && !Array.isArray(item.keys) && !isString(item.keys)) {
    throw new TypeError('Key must be an array or a string.');
  }
};

const validateMiddlewares = (middlewares) => {
  if (!middlewares) return;

  if (!isObject(middlewares)) {
    throw new TypeError('Middlewares must be an object.');
  }

  const invalidKeys = Object.keys(middlewares).filter(key => !validMiddlewares.includes(key));
  if (invalidKeys.length > 0) {
    throw new TypeError(`Invalid middleware keys: ${invalidKeys.join(', ')}. Valid keys are: [${validMiddlewares.join(', ')}]`);
  }

  const nonFunctionMiddlewares = Object.entries(middlewares)
    .filter(([_, value]) => !isFunction(value))
    .map(([key]) => key);
  
  if (nonFunctionMiddlewares.length > 0) {
    throw new TypeError(`Middlewares must be functions. Invalid middlewares: ${nonFunctionMiddlewares.join(', ')}`);
  }
};

const getMiddleware = (middlewares, name) => middlewares?.[name] || null;

const getDefaultValues = (item) => ({
  checkPrefixOnly: isObject(item) ? item.prefixOnly : DEFAULT_PREFIX_ONLY,
  defaultNgamMinSize: isObject(item) ? item.minSize : DEFAULT_MIN_SIZE,
});

const getArgs = (queryArgs) => {
  if (isString(queryArgs)) {
    return { queryString: queryArgs, exact: false };
  }
  
  const { query: queryString, exact = false } = queryArgs;
  return { queryString, exact: !!exact };
};

function fuzzySearch(...args) {
  const startTime = Date.now();
  const queryArgs = Object.values(args);
  const { callback, options } = parseArguments(queryArgs, 1, 2);

  if (queryArgs.length === 0 || (!isString(queryArgs[0]) && !isObject(queryArgs[0]))) {
    throw new TypeError(
      'Fuzzy Search: First argument is mandatory and must be a string or an object.',
    );
  }

  const { exact, queryString } = getArgs(queryArgs[0]);
  if (!queryString) {
    return this.find(options);
  }

  const { checkPrefixOnly, defaultNgamMinSize } = getDefaultValues(queryArgs[0]);

  const query = exact
    ? `"${queryString}"`
    : nGrams(queryString, false, defaultNgamMinSize, checkPrefixOnly).join(' ');

  const search = !isObject(options)
    ? { $text: { $search: query } }
    : { $and: [{ $text: { $search: query } }, options] };

  const queryPromise = this instanceof Query
    ? this.find.apply(this, [search, callback])
    : this.find.apply(this, [
        search,
        { confidenceScore: { $meta: 'textScore' } },
        { sort: { confidenceScore: { $meta: 'textScore' } } },
        callback,
      ]);

  // Record analytics
  if (this.analytics) {
    queryPromise.then(results => {
      const responseTime = Date.now() - startTime;
      this.analytics.recordSearch(queryString, results.length, responseTime);
    }).catch(() => {
      const responseTime = Date.now() - startTime;
      this.analytics.recordSearch(queryString, 0, responseTime, false);
    });
  }

  return queryPromise;
}

/**
 * Plugin's main function. Creates the fuzzy fields on the collection, set's a pre save middleware to create the Ngrams for the fuzzy fields
 * and creates the instance methods `fuzzySearch` which finds the guesses.
 * @param {object} schema - Mongo Collection
 * @param {object} options - plugin options
 */
module.exports = function (schema, pluginOptions) {
  if (!pluginOptions?.fields) {
    throw new Error('You must set at least one field for fuzzy search.');
  }

  const { fields, middlewares, equalityPredicate, analytics, suggestions } = pluginOptions;

  if (!Array.isArray(fields)) {
    throw new TypeError('Fields must be an array.');
  }

  if (isObject(equalityPredicate) && Object.keys(equalityPredicate).length !== 1) {
    throw new TypeError('Equality filter can have only one filter');
  }

  // Validate field configurations
  fields.forEach(field => {
    validateItem(field);
    if (field.config) {
      const invalidConfigs = Object.keys(field.config).filter(key => !validFieldConfigs.includes(key));
      if (invalidConfigs.length > 0) {
        throw new TypeError(`Invalid field configurations: ${invalidConfigs.join(', ')}. Valid configs are: [${validFieldConfigs.join(', ')}]`);
      }
    }
  });

  validateMiddlewares(middlewares);

  // Initialize analytics if enabled
  if (analytics) {
    schema.statics.analytics = new SearchAnalytics();
  }

  // Initialize suggestions if enabled
  if (suggestions) {
    schema.statics.suggestions = new SearchSuggestions(suggestions);
  }

  const { indexes, weights } = createFields(schema, fields, equalityPredicate);
  schema.index(indexes, { weights, name: 'fuzzy_text' });

  const hideElements = removeFuzzyElements(fields);
  const { toJSON, toObject } = setTransformers(hideElements)(schema);

  schema.options = {
    ...schema.options,
    toObject,
    toJSON,
  };

  function thenable(fn, cb, attr) {
    if (!fn) return cb();
    return Promise.resolve(fn.bind(this)(attr)).then(cb);
  }

  function saveMiddleware(next) {
    const attributes = this;
    return function () {
      createNGrams(attributes, fields);
      next();
    };
  }

  function updateMiddleware(next) {
    const attributes = this._update;
    return function () {
      createNGrams(attributes, fields);
      next();
    };
  }

  function insertMany(next, docs) {
    return function () {
      docs.forEach((doc) => createNGrams(doc, fields));
      next();
    };
  }

  function preUpdate(fnName) {
    const fn = getMiddleware(middlewares, fnName);
    return function (next) {
      return thenable.bind(this)(fn, updateMiddleware.bind(this)(next));
    };
  }

  schema.pre('save', function (next) {
    const fn = getMiddleware(middlewares, 'preSave');
    return thenable.bind(this)(fn, saveMiddleware.bind(this)(next));
  });

  schema.pre('insertMany', function (next, docs) {
    const fn = getMiddleware(middlewares, 'preInsertMany');
    return thenable.bind(this)(fn, insertMany.bind(this)(next, docs), docs);
  });

  schema.pre('update', preUpdate('preUpdate'));
  schema.pre('updateOne', preUpdate('preUpdateOne'));
  schema.pre('findOneAndUpdate', preUpdate('preFindOneAndUpdate'));
  schema.pre('updateMany', preUpdate('preUpdateMany'));

  schema.statics.fuzzySearch = function (...args) {
    return fuzzySearch.apply(this, args);
  };

  schema.query.fuzzySearch = function (...args) {
    return fuzzySearch.apply(this, args);
  };

  // Add aggregation pipeline support
  schema.statics.fuzzySearchAggregate = function (query, options = {}) {
    const { exact, queryString } = getArgs(query);
    if (!queryString) {
      return this.aggregate(options.pipeline || []);
    }

    const { checkPrefixOnly, defaultNgamMinSize } = getDefaultValues(query);
    const ngramQuery = nGrams(queryString, false, defaultNgamMinSize, checkPrefixOnly).join(' ');

    const searchStage = {
      $search: {
        text: {
          query: ngramQuery,
          path: fields.map(f => f.keys).flat(),
          fuzzy: {
            maxEdits: options.maxEdits || 1,
            prefixLength: options.prefixLength || 1
          }
        }
      }
    };

    const pipeline = [searchStage, ...(options.pipeline || [])];
    return this.aggregate(pipeline);
  };

  // Add suggestions method
  schema.statics.getSuggestions = function (query, options = {}) {
    if (!this.suggestions) {
      throw new Error('Suggestions are not enabled for this model');
    }
    return this.find().then(docs => 
      this.suggestions.generateSuggestions(query, docs, fields.map(f => f.keys).flat())
    );
  };

  // Add analytics method
  schema.statics.getAnalytics = function (metrics) {
    if (!this.analytics) {
      throw new Error('Analytics are not enabled for this model');
    }
    return this.analytics.getAnalytics(metrics);
  };
};
