const mongoose = require('mongoose');

const { Schema } = mongoose;
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

const getURL = async () => {
  if (process.env.MONGO_DB) {
    return 'mongodb://localhost:27017/fuzzy-test';
  }

  mongod = await MongoMemoryServer.create();
  return mongod.getUri();
};

const openConnection = async () => {
  const uri = await getURL();

  mongoose.Promise = global.Promise;
  return mongoose.connect(uri);
};

const closeConnection = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
  }
};

const createSchema = (name, schemaStructure, options = {}) => (plugin, fields, middlewares) => {
  const testName = name.replace(/ /g, '_').toLowerCase();

  const schema = new Schema(schemaStructure, {
    collection: `fuzzy_searching_test_${testName}`,
    ...options,
  });
  schema.plugin(plugin, {
    fields,
    middlewares,
  });

  return mongoose.model(`Model${testName}`, schema);
};

const seed = async (Model, obj) => {
  // Ensure the (text) indexes exist before documents are queried with `$text`.
  await Model.init();
  const doc = new Model(obj);
  return doc.save();
};

module.exports = {
  openConnection,
  closeConnection,
  createSchema,
  seed,
};
