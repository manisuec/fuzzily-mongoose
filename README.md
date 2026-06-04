[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> <a href="https://www.buymeacoffee.com/manisuec" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="52" width="200"></a> <br/>
> If you find this utility library useful, you can [buy me a coffee](https://www.buymeacoffee.com/manisuec) to keep me energized for creating libraries like this.

# Fuzzily-Mongoose: Efficient Fuzzy Search Plugin for MongoDB

## Fuzzy Search for MongoDB Without the Cost of Atlas or Elasticsearch

fuzzily-mongoose adds partial text (fuzzy) search to self-hosted MongoDB. It is a fork of [VassilisPallas/mongoose-fuzzy-searching](https://github.com/VassilisPallas/mongoose-fuzzy-searching). The fork adds an equality predicate that filters documents before the text query runs, which lowers the number of documents scanned per search.

The reason for a fork and a new npm library is simply from the limitation that text query based on fuzzy logic scans all the documents in a given collection and only then you can filter out documents based on values of other fields. This makes the query inefficient. With the introduction of `equalityPredicate`, you can first filter out the documents and then perform a text query on the filtered documents. See the [Performance section](#performance-equality-predicates) for the numbers. With the help of this plugin, you can enable partial text search efficiently in self hosted Mongodb installation without going for paid services of Mongodb Atlas or using solutions like Elasticsearch etc. This is very helpful for startups during initial days when cost is a concern and also for developers who are working on their own ideas.

<!-- 
[![Build Status](https://travis-ci.com/VassilisPallas/mongoose-fuzzy-searching.svg?token=iwmbqGL1Zp9rkA7hmQ6P&branch=master)](https://travis-ci.com/VassilisPallas/mongoose-fuzzy-searching)
[![codecov](https://codecov.io/gh/VassilisPallas/mongoose-fuzzy-searching/branch/master/graph/badge.svg)](https://codecov.io/gh/VassilisPallas/mongoose-fuzzy-searching) -->
<!-- [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FVassilisPallas%2Fmongoose-fuzzy-searching.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2FVassilisPallas%2Fmongoose-fuzzy-searching?ref=badge_shield) -->

## Why Fuzzily-Mongoose?

- Runs on self-hosted MongoDB, so it does not need MongoDB Atlas or Elasticsearch
- Equality predicates narrow the document set before the text query runs
- Plugs into an existing Mongoose schema
- Per-field n-gram size, prefix matching, and weights are configurable
- Works with data that predates the plugin through the migration steps below

## Topics

- [Features](#features)
- [Install](#install)
- [Getting started](#getting-started)
  - [Initialize plugin](#initialize-plugin)
  - [Plugin options](#plugin-options)
    - [Fields](#fields)
      - [String field](#string-field)
      - [Object field](#object-field)
    - [Analytics](#analytics)
    - [Suggestions](#suggestions)
    - [Aggregation Pipeline](#aggregation-pipeline)
    - [Equality Predicate](#equality-predicate)
    - [Middlewares](#middlewares)
- [Query parameters](#query-parameters)
  - [Instance method](#instance-method)
  - [Query helper](#query-helper)
- [Working with pre-existing data](#working-with-pre-existing-data)
  - [Update all pre-existing documents with ngrams](#update-all-pre-existing-documents-with-ngrams)
  - [Delete old ngrams from all documents](#delete-old-ngrams-from-all-documents)
- [Testing and code coverage](#testing-and-code-coverage)
  - [All tests](#all-tests)
  - [Available test suites](#available-test-suites)
- [Performance](#performance)
- [License](#license)

## Features

- Creates Ngrams for the selected keys in the collection
- [Add **fuzzySearch** method on model](#simple-usage)
- [Work with pre-existing data](#work-with-pre-existing-data)
- Per-field search weights
- Search analytics
- Smart Search suggestions
- Aggregation pipeline support
- Equality predicates

## Install

```bash
npm install fuzzily-mongoose
# or
yarn add fuzzily-mongoose
```

## Getting started

### Initialize plugin

Before starting, for best practices and avoid any issues, handle correctly all the [Deprecation Warnings](https://mongoosejs.com/docs/deprecations.html).

In order to let the plugin create the indexes, you need to set `useCreateIndex` to true. The below example demonstrates how to connect with the database.

```javascript
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
};

mongoose.Promise = global.Promise;
return mongoose.connect(URL, options);
```

In the below example, we have a `User` collection and we want to make fuzzy searching in `firstName` and `lastName`.

```javascript
const { Schema } = require('mongoose');
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  age: Number,
});

UserSchema.plugin(fuzzily_mongoose, { fields: ['firstName', 'lastName'] });
const User = mongoose.model('User', UserSchema);
module.exports = { User };
```

```javascript
const user = new User({ firstName: 'Joe', lastName: 'Doe', email: 'joe.doe@mail.com', age: 30 });

try {
  await user.save(); // mongodb: { ..., firstName_fuzzy: [String], lastName_fuzzy: [String] }
  const users = await User.fuzzySearch('jo');

  console.log(users);
  // each user object will not contain the fuzzy keys:
  // Eg.
  // {
  //   "firstName": "Joe",
  //   "lastName": "Doe",
  //   "email": "joe.doe@mail.com",
  //   "age": 30,
  //   "confidenceScore": 34.3 ($text meta score)
  // }
} catch (e) {
  console.error(e);
}
```

The results are sorted by the `confidenceScore` key. You can override this option.

```javascript
try {
  const users = await User.fuzzySearch('jo').sort({ age: -1 }).exec();
  console.log(users);
} catch (e) {
  console.error(e);
}
```

## Usage Example

```javascript
// Import and setup
const mongoose = require('mongoose');
const fuzzySearchPlugin = require('fuzzily-mongoose');

// Define your schema
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  orgId: String
});

// Add fuzzy search with an orgId equality predicate
UserSchema.plugin(fuzzySearchPlugin, { 
  fields: ['firstName', 'lastName'],
  equalityPredicate: { orgId: 1 }  // filter on orgId before the text query
});

const User = mongoose.model('User', UserSchema);

// Search within a single org
const results = await User.fuzzySearch('joe', { orgId: 'ORG100' });
console.log(results);
```

## Performance: Equality Predicates

Define a collection as below

```javascript
const mongoose = require('mongoose');
const fuzzySearchPlugin = require('fuzzily-mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
});

productSchema.plugin(fuzzySearchPlugin, {
  fields: ['name'],  // Specify the fields for fuzzy searching
  equalityPredicate: { category: 1 }, // Predicate for filtering
});

const Product = mongoose.model('Product', productSchema);
```

Now insert data into this collection and perform query:

```javascript
const results = await Product.fuzzySearch(
   { query: "Smartphone" },
   { category: "Electronics" }
);

console.log(results);
```

A plain `$text` search in MongoDB scans the whole collection and filters afterwards. With `equalityPredicate` the order is reversed:

1. Documents are filtered by the exact field match first.
2. The fuzzy text query then runs only on that subset.
3. Fewer documents are scanned per query.

### Performance Comparison

| Metric | Without Equality Predicate | With Equality Predicate | Improvement |
|--------|----------------------------|-------------------------|-------------|
| Keys Examined | 36,854 | 1,739 | 95% reduction |
| Docs Examined | 24,298 | 566 | 98% reduction |
| Execution Time | 88ms | 6ms | 15x faster |

## Key Features

- **N-gram fuzzy matching**: matches through typos and misspellings
- **Weighted fields**: rank matches in some fields above others
- **Prefix-only matching**: useful for autocomplete
- **Nested object support**: search keys inside subdocuments
- **Confidence scoring**: results sort by text score by default
- **Chainable queries**: composes with the Mongoose query builder

![performance](https://github.com/manisuec/fuzzily-mongoose/blob/main/image.png)

Read more in detail at [Building Fuzzy Search in MongoDB: An Open-Source Solution](https://medium.com/@manisuec/building-fuzzy-search-in-mongodb-an-open-source-solution-29f3cd5f2e49)

### Plugin options

Options can contain `fields`, `middlewares`, `analytics`, `suggestions`, and `equalityPredicate`.

#### Fields

Fields attribute is mandatory and should be either an array of `Strings` or an array of `Objects`.

##### String field

If you want to use the default options for all your fields, you can just pass them as a string.

```javascript
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
});

UserSchema.plugin(fuzzily_mongoose, { fields: ['firstName', 'lastName'] });
```

##### Object field

In case you want to override any of the default options for your arguments, you can add them as an object. You can also specify field-specific weights and configurations:

```javascript
const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: [
    { name: 'firstName', weight: 2 },  // Higher weight for firstName
    { name: 'lastName', weight: 1 },   // Default weight for lastName
    { 
      name: 'email',
      weight: 0.5,
      config: {
        minSize: 3,        // Minimum n-gram size
        prefixOnly: true   // Only match prefixes
      }
    }
  ]
});
```

#### Analytics

Set `analytics: true` to record search counts, result counts, and response times:

```javascript
const UserSchema = new Schema({
  firstName: String,
  lastName: String,
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: ['firstName', 'lastName'],
  analytics: true  // Enable analytics
});

// Get all analytics data
const analytics = await User.getAnalytics();
console.log(analytics);
// {
//   searchCount: 100,
//   resultCount: 320,
//   responseTime: [12, 8, 15, ...],          // recorded times (ms)
//   popularSearches: [['john', 25], ['joe', 18]],  // top 10 [query, count]
//   failedSearches: [['xyz', 3]]              // top 10 queries with no results
// }

// Get only specific metrics (responseTime is summarised when requested)
const metrics = await User.getAnalytics(['searchCount', 'responseTime']);
console.log(metrics);
// {
//   searchCount: 100,
//   responseTime: { avg: 11.6, min: 8, max: 15 }
// }
```

Valid metric names: `searchCount`, `resultCount`, `responseTime`, `popularSearches`, `failedSearches`.

#### Suggestions

Pass a `suggestions` object to enable query suggestions:

```javascript
const UserSchema = new Schema({
  firstName: String,
  lastName: String,
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: ['firstName', 'lastName'],
  suggestions: {
    minSize: 2,          // Minimum n-gram size used for matching (default: 2)
    prefixOnly: false,   // Only match prefixes (default: false)
    maxSuggestions: 5,   // Maximum number of suggestions (default: 10)
    minScore: 0.5        // Minimum similarity score, 0-1 (default: 0.5)
  }
});

// Get suggestions for a partial query.
// Returns an array of { suggestion, score } objects sorted by score (desc).
const suggestions = await User.getSuggestions('jo');
console.log(suggestions);
// [
//   { suggestion: 'Joe', score: 1 },
//   { suggestion: 'John', score: 0.66 },
//   { suggestion: 'Jordan', score: 0.5 }
// ]
```

#### Aggregation Pipeline

Use the aggregation pipeline for complex search queries:

```javascript
// First argument: the query (String, or an Object with { query, minSize, prefixOnly, exact })
// Second argument: { pipeline }, extra stages appended after the fuzzy $match stage
const results = await User.fuzzySearchAggregate(
  { query: 'jo', minSize: 2, prefixOnly: true },
  {
    pipeline: [
      { $match: { age: { $gt: 18 } } },
      { $project: { firstName: 1, lastName: 1 } }
    ]
  }
);
```

The fuzzy `$text` match is injected as the **first** stage of the pipeline (required by MongoDB), then your custom stages run on the matched documents.

#### Equality Predicate

`equalityPredicate` is an optional `Object`. 

e.g.

```javascript
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  orgId: String
});

UserSchema.plugin(fuzzily_mongoose, { fields: ['firstName'], equalityPredicate: {orgId: 1} });
```

This will create a fuzzy text index:
```
key: { orgId: 1, _fts: 'text', _ftsx: 1 },
    name: 'fuzzy_text',
```

```javascript
User.fuzzySearch({ query: 'jo', prefixOnly: true, minSize: 4 }, {orgId: 'ORG100'})
  .then(console.log)
  .catch(console.error);

```

The query above filters documents by org id first, then runs the text query on that subset. Fewer documents are scanned, so the query runs faster.

#### Middlewares

Middlewares is an optional `Object` that can contain custom `pre` middlewares. This plugin is using these middlewares in order to create or update the fuzzy elements. That means that if you add `pre` middlewares, they will never get called since the plugin overrides them. To avoid that problem you can pass your custom midlewares into the plugin. Your middlewares will be called **first**. The middlewares you can pass are:

- preSave
  - stands for `schema.pre("save", ...)`
- preInsertMany
  - stands for `schema.pre("insertMany", ...)`
- preUpdate
  - stands for `schema.pre("update", ...)`
- preUpdateOne
  - stands for `schema.pre("updateOne", ...)`
- preFindOneAndUpdate
  - stands for `schema.pre("findOneAndUpdate", ...)`
- preUpdateMany
  - stands for `schema.pre("updateMany", ...)`

If you want to add any of the middlewares above, you can add it directly on the plugin.

```javascript
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: ['firstName'],
  middlewares: {
    preSave: function () {
      // do something before the object is saved
    },
  },
});
```

Middlewares can also be asynchronous functions:

```javascript
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: ['firstName'],
  middlewares: {
    preUpdateOne: async function {
      // do something before the object is updated (asynchronous)
    }
  }
});
```

## Query parameters

The fuzzy search query can be used either as `static` function, or as a `helper`, which let's you to chain multiple queries together. The function name in either case is surprise, surprise, `fuzzySearch`.

### Instance method

Instance method can accept up to three parameters. The first one is the query, which can either be either a `String` or an `Object`. This parameter is **required**.
The second parameter can either be eiter an `Object` that contains any additional queries (e.g. `age: { $gt: 18 }`), or a callback function.
If the second parameter is the queries, then the third parameter is the callback function. If you don't set a callback function, the results will be returned inside a Promise.

The below table contains the expected keys for the first parameter (if is an object)

| **key**    | **type**    | **deafult** | **description**                                                                   |
| ---------- | ----------- | ----------- | --------------------------------------------------------------------------------- |
| query      | **String**  | null        | String to search                                                                  |
| minSize    | **Integer** | 2           | N-grams min size.                                                                 |
| prefixOnly | **Boolean** | false       | Only return ngrams from start of word. (It gives more precise results) the prefix |
| exact      | **Boolean** | false       | Matches on a phrase, as opposed to individual terms                               |

Example:

```javascript
/* With string that returns a Promise */
User.fuzzySearch('jo').then(console.log).catch(console.error);

/* With additional options that returns a Promise */
User.fuzzySearch({ query: 'jo', prefixOnly: true, minSize: 4 })
  .then(console.log)
  .catch(console.error);

/* With additional queries that returns a Promise */
User.fuzzySearch('jo', { age: { $gt: 18 } })
  .then(console.log)
  .catch(console.error);

/* With string and a callback */
User.fuzzySearch('jo', (err, doc) => {
  if (err) {
    console.error(err);
  } else {
    console.log(doc);
  }
});

/* With additional queries and callback */
User.fuzzySearch('jo', { age: { $gt: 18 } }, (err, doc) => {
  if (err) {
    console.error(err);
  } else {
    console.log(doc);
  }
});
```

### Query helper

You can also use the query is a helper function, which is like instance methods but for mongoose queries. Query helper methods let you extend mongoose's chainable query builder API.

Query helper can accept up to two parameters. The first one is the query, which can either be either a `String` or an `Object`. This parameter is **required**.
The second parameter can be an `Object` that contains any additional queries (e.g. `age: { $gt: 18 }`), which is optional.
This helpers doesn't accept a callback function. If you pass a function it will throw an error. More about [query helpers](https://mongoosejs.com/docs/guide.html#query-helpers).

Example:

```javascript
const user = await User.find({ age: { $gte: 30 } })
  .fuzzySearch('jo')
  .exec();
```

## Working with pre-existing data

The plugin creates indexes for the selected fields. In the below example the new indexes will be `firstName_fuzzy` and `lastName_fuzzy`. Also, each document will have the fields `firstName_fuzzy`[String] and `lastName_fuzzy`[String]. These arrays will contain the anagrams for the selected fields.

```javascript
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  age: Number,
});

UserSchema.plugin(fuzzily_mongoose, { fields: ['firstName', 'lastName'] });
```

In other words, this plugin creates anagrams when you create or update a document. All the pre-existing documents won't contain these fuzzy arrays, so `fuzzySearch` function, will not be able to find them.

### Update all pre-existing documents with ngrams

In order to create anagrams for pre-existing documents, you should update each document. The below example, updates the `firstName` attribute to every document on the collection `User`.

```js
const query = {};
let promiseArr = [];
let count = 0;

for await (const item of Model.find(query).cursor()) {
  const obj = attrs.reduce((acc, attr) => ({ ...acc, [attr]: item[attr] }), {});
  promiseArr.push(databaseService.findByIdAndUpdate(modelName, item._id, obj));

  if (count % 50 === 0) {
    await Promise.all(promiseArr);
    promiseArr = [];
  }

  count++;
}

if (promiseArr.length !== 0) {
  await Promise.all(promiseArr);
}
```

### Delete old ngrams from all documents

In the previous example, we set `firstName` and `lastName` as the fuzzy attributes. If you remove the `firstName` from the fuzzy fields, the `firstName_fuzzy` array will not be removed by the collection. If you want to remove the array on each document you have to unset that value.

```javascript
// const attrs = ['field_name'];
const query = {};
let promiseArr = [];
let count = 0;

for await (const item of Model.find(query).cursor()) {
  const $unset = attrs.reduce(
    (acc, attr) => ({ ...acc, [`${attr}_fuzzy`]: 1 }),
    {}
  );

  promiseArr.push(databaseService.update(modelName, item._id, { $unset }));

  if (count % 50 === 0) {
    await Promise.all(promiseArr);
    promiseArr = [];
  }

  count++;
}

if (promiseArr.length !== 0) {
  await Promise.all(promiseArr);
}
```

## Testing and code coverage

### All tests

We use [jest](https://jestjs.io/) for all of our unit and integration tests.

```bash
$ npm test
```

_Note: this will run all suites **serially** to avoid mutliple concurrent connection on the db._

This will run the tests using a memory database. If you wish for any reason to run the tests using an actual connection on a mongo instance, add the environment variable `MONGO_DB`:

```bash
$ docker run --name mongo_fuzzy_test -p 27017:27017 -d mongo
$ MONGO_DB=true npm test
```

### Available test suites

#### unit tests

```bash
$ npm run test:unit
```

#### Integration tests

```bash
$ npm run test:integration
```

### Comparison

[Fuzzy search comparison](https://github.com/Aditya-ds-2000/Fuzzy-Search-comparison-in-MongoDB) - Compare both approaches for yourself by running the test cases we've set up. See the performance improvement in real-time!

## Learn More

Read our detailed guide on [Building Efficient Fuzzy Search in MongoDB](https://medium.com/@manisuec/building-fuzzy-search-in-mongodb-an-open-source-solution-29f3cd5f2e49) for implementation tips and performance optimization techniques.

Visit [Tech Insights: Personal Tech Blog](https://techinsights.manisuec.com) for more advanced MongoDB techniques.

## License

MIT License

Copyright (c) 2024 Manish Prasad

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

<!-- [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FVassilisPallas%2Fmongoose-fuzzy-searching.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FVassilisPallas%2Fmongoose-fuzzy-searching?ref=badge_large) -->

**********************************************************************************

> <a href="https://www.buymeacoffee.com/manisuec" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="52" width="200"></a> <br/>
> If you find this utility library useful, you can [buy me a coffee](https://www.buymeacoffee.com/manisuec) to keep me energized for creating libraries like this.

## Advanced Features and Examples

### Field-specific Search Weights

A higher weight ranks matches in that field above matches in lower-weighted fields.

```javascript
const ProductSchema = new Schema({
  name: String,
  description: String,
  tags: [String],
  sku: String
});

ProductSchema.plugin(fuzzily_mongoose, {
  fields: [
    { name: 'name', weight: 10 },        // Highest priority
    { name: 'description', weight: 5 },   // Medium priority
    { name: 'tags', weight: 3 },         // Lower priority
    { name: 'sku', weight: 1 }           // Lowest priority
  ]
});

// Search example
const results = await Product.fuzzySearch('smartphone');
// Results will prioritize matches in the 'name' field over other fields
```

You can also configure additional parameters for each field:

```javascript
ProductSchema.plugin(fuzzily_mongoose, {
  fields: [
    {
      name: 'name',
      weight: 10,
      config: {
        minSize: 3,        // Minimum n-gram size
        prefixOnly: true   // Only match prefixes
      }
    },
    {
      name: 'description',
      weight: 5,
      config: {
        minSize: 2,
        prefixOnly: false  // Match anywhere in the text
      }
    }
  ]
});
```

Valid `config` keys are: `minSize`, `prefixOnly`, `weight`, `usePhonetic`, `useStemming`, `language`, and `suggestions`. Passing any other key throws a `TypeError` at plugin registration.

### Search Analytics

Set the `analytics` option to `true` to record search activity on the model:

```javascript
const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: ['firstName', 'lastName', 'email'],
  analytics: true
});

// Get overall analytics
const analytics = await User.getAnalytics();
console.log(analytics);
// {
//   searchCount: 150,
//   resultCount: 480,
//   responseTime: [45, 32, 51, ...],
//   popularSearches: [
//     ['john', 25],
//     ['smith', 18]
//   ],
//   failedSearches: [
//     ['zzz', 4]
//   ]
// }

// Get analytics for specific metrics.
// When 'responseTime' is requested it is summarised as { avg, min, max }.
const metrics = await User.getAnalytics(['responseTime', 'searchCount']);
console.log(metrics);
// {
//   responseTime: { avg: 42.6, min: 32, max: 51 },
//   searchCount: 150
// }
```

### Smart Search Suggestions

`getSuggestions` returns candidate values ranked by n-gram overlap with the query:

```javascript
const ProductSchema = new Schema({
  name: String,
  category: String,
  brand: String
});

ProductSchema.plugin(fuzzily_mongoose, {
  fields: ['name', 'category', 'brand'],
  suggestions: {
    minSize: 2,             // Minimum n-gram size used for matching
    prefixOnly: false,      // Only match prefixes
    maxSuggestions: 5,      // Maximum number of suggestions
    minScore: 0.7           // Minimum similarity score (0-1)
  }
});

// Get suggestions for a partial query.
// Returns an array of { suggestion, score } objects, sorted by score (desc).
const suggestions = await Product.getSuggestions('app');
console.log(suggestions);
// [
//   { suggestion: 'apple', score: 1 },
//   { suggestion: 'application', score: 0.8 },
//   { suggestion: 'appliance', score: 0.75 },
//   { suggestion: 'apparel', score: 0.7 }
// ]
```

> **Note:** `getSuggestions` matches against the configured fuzzy `fields` across all documents. The similarity score is the fraction of the query's n-grams that appear in a candidate value.

### Aggregation Pipeline Support

`fuzzySearchAggregate` runs the fuzzy match as the first stage, then your own pipeline stages:

```javascript
const OrderSchema = new Schema({
  customerName: String,
  productName: String,
  amount: Number,
  status: String,
  createdAt: Date
});

OrderSchema.plugin(fuzzily_mongoose, {
  fields: ['customerName', 'productName']
});

// Complex search with aggregation
const results = await Order.fuzzySearchAggregate('john', {
  pipeline: [
    // Match orders with amount greater than 100
    { $match: { amount: { $gt: 100 } } },
    
    // Group by status and calculate totals
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    
    // Sort by total amount
    { $sort: { totalAmount: -1 } }
  ]
});

console.log(results);
// [
//   { _id: 'completed', totalAmount: 5000, count: 10 },
//   { _id: 'pending', totalAmount: 3000, count: 5 }
// ]
```

You can also combine fuzzy search with other aggregation stages:

```javascript
const results = await Order.fuzzySearchAggregate('smartphone', {
  pipeline: [
    // Match specific date range
    {
      $match: {
        createdAt: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-03-31')
        }
      }
    },
    
    // Lookup related customer data
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      }
    },
    
    // Project only needed fields
    {
      $project: {
        customerName: 1,
        productName: 1,
        amount: 1,
        'customer.email': 1
      }
    }
  ]
});
```
