[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> <a href="https://www.buymeacoffee.com/manisuec" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-blue.png" alt="Buy Me A Coffee" height="52" width="200"></a> <br/>
> If you find this utility library useful, you can [buy me a coffee](https://www.buymeacoffee.com/manisuec) to keep me energized for creating libraries like this.

# Mongoose Fuzzy Searching

Harness the power of fuzzy logic with `fuzzily-mongoose`, an open source, simple and lightweight plugin that enables fuzzy searching in documents in MongoDB. This repo is a fork from [VassilisPallas/mongoose-fuzzy-searching](https://github.com/VassilisPallas/mongoose-fuzzy-searching).

The reason for a fork and a new npm library is simply from the limitation that text query based on fuzzy logic scans all the documents in a given collection and only then you can filter out documents based on values of other fields. This makes the query inefficient. With the introduction of `equalityPredicate`, you can first filter out the documents and then perform a text query on the filtered documents. See [Performance section](#performance) for improvement in search with `fuzzily-mongoose` plugin. With the help of this plugin, you can enable partial text search efficiently in self hosted Mongodb installation without going for paid services of Mongodb Atlas or using solutions like Elasticsearch etc. This is very helpful for startups during initial days when cost is a concern and also for developers who are working on their own ideas.

<!-- 
[![Build Status](https://travis-ci.com/VassilisPallas/mongoose-fuzzy-searching.svg?token=iwmbqGL1Zp9rkA7hmQ6P&branch=master)](https://travis-ci.com/VassilisPallas/mongoose-fuzzy-searching)
[![codecov](https://codecov.io/gh/VassilisPallas/mongoose-fuzzy-searching/branch/master/graph/badge.svg)](https://codecov.io/gh/VassilisPallas/mongoose-fuzzy-searching) -->
<!-- [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FVassilisPallas%2Fmongoose-fuzzy-searching.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2FVassilisPallas%2Fmongoose-fuzzy-searching?ref=badge_shield) -->

- [Features](#features)
- [Install](#install)
- [Getting started](#getting-started)
  - [Initialize plugin](#initialize-plugin)
  - [Plugin options](#plugin-options)
    - [Fields](#fields)
      - [String field](#string-field)
      - [Object field](#object-field)
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

## Install

Install using [npm](https://npmjs.org)

```bash
$ npm i fuzzily-mongoose
```

or using yarn

```bash
$ yarn add fuzzily-mongoose
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

### Plugin options

Options can contain `fields` and `middlewares`.

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

In case you want to override any of the default options for your arguments, you can add them as an object
and override any of the values you wish.
The below table contains the expected keys for this object.

| **key**                 | **type**          | **default** | **description**                                                                                                                                                                                                          |
| ----------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name                    | **String**        | null        | Collection key name                                                                                                                                                                                                      |
| minSize                 | **Integer**       | 2           | N-grams min size. [Learn more about N-grams](http://text-analytics101.rxnlp.com/2014/11/what-are-n-grams.html)                                                                                                           |
| weight                  | **Integer**       | 1           | Denotes the significance of the field relative to the other indexed fields in terms of the text search score. [Learn more about index weights](https://docs.mongodb.com/manual/tutorial/control-results-of-text-search/) |
| prefixOnly              | **Boolean**       | false       | Only return ngrams from start of word. (It gives more precise results)                                                                                                                                                   |
| escapeSpecialCharacters | **Boolean**       | true        | Remove special characters from N-grams.                                                                                                                                                                                  |
| keys                    | **Array[String]** | null        | If the type of the collection attribute is `Object` or `[Object]` (see example), you can define which attributes will be used for fuzzy searching                                                                        |

Example:

```javascript
const fuzzily_mongoose = require('fuzzily-mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  content: {
      en: String,
      de: String,
      it: String
  }
  text: [
    {
      title: String,
      description: String,
      language: String,
    },
  ],
});

UserSchema.plugin(fuzzily_mongoose, {
  fields: [
    {
      name: 'firstName',
      minSize: 2,
      weight: 5,
    },
    {
      name: 'lastName',
      minSize: 3,
      prefixOnly: true,
    },
    {
      name: 'email',
      escapeSpecialCharacters: false,
    },
    {
      name: 'content',
      keys: ['en', 'de', 'it'],
    },
    {
      name: 'text',
      keys: ['title', 'language'],
    },
  ],
});
```

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

The above code will first filter out documents based on org id and then run text query on filtered documents. This improves the number of documents scanned and hence improves the performance of query in a big way.

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

## Performance

Let us define a collection as below
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
![performance](image.png)

**Without Equality Predicate** (Old Approach)

In the old approach, MongoDB runs a fuzzy search across the entire collection, resulting in a high number of documents and keys being examined:
Total Keys Examined: 36,854
Total Docs Examined: 24,298
Execution Time: 88 ms

These numbers represent the large search space MongoDB has to sift through, which slows down query performance, especially as the collection size grows.

**With Equality Predicate** (New Approach)

By applying the equality predicate and utilizing a compound text index, I was able to significantly narrow down the search space. Here's how the new approach performed:
Total Keys Examined: 1739
Total Docs Examined: 566
Execution Time: 6 ms

The improvement here is substantial. By reducing the number of documents and keys MongoDB needs to examine, the query becomes far more efficient, leading to faster response times and reduced load on the database.

Read more in detail at [Building Fuzzy Search in MongoDB: An Open-Source Solution](https://medium.com/@manisuec/building-fuzzy-search-in-mongodb-an-open-source-solution-29f3cd5f2e49)

### Comparison

[Fuzzy search comparison](https://github.com/Aditya-ds-2000/Fuzzy-Search-comparison-in-MongoDB) - Compare both approaches for yourself by running the test cases we've set up. See the performance improvement in real-time!

## Tech Blog
Read my blog at [Tech Insights: Personal Tech Blog](https://techinsights.manisuec.com)

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
