const createSchemaObject = (typeValue, options) => ({
  ...options,
  type: typeValue,
});

const addToSchema = (name) => ({
  [`${name}_fuzzy`]: createSchemaObject([String], {
    default: '',
    index: false,
  }),
});

const addArrayToSchema = (MixedType) => (name) => ({
  [`${name}_fuzzy`]: createSchemaObject(MixedType, {
    default: [],
    index: false,
  }),
});

const setTransformers = (isFunction) => (hideElements) => (schema) => {
  let toObjectTransform;
  let toJSONTransform;

  if (schema.options.toObject && schema.options.toObject.transform) {
    toObjectTransform = schema.options.toObject.transform;
  }

  if (schema.options.toJSON && schema.options.toJSON.transform) {
    toJSONTransform = schema.options.toJSON.transform;
  }

  const toObject = {
    ...(schema.options.toObject || {}),
    transform: (doc, ret, cb) => {
      let result = hideElements(doc, ret, cb)
      if (isFunction(toObjectTransform)) {
        result = toObjectTransform(doc, result, cb);
      }
      return result
    },
  };

  const toJSON = {
    ...(schema.options.toJSON || {}),
    transform: (doc, ret, cb) => {
      let result = hideElements(doc, ret, cb)
      if (isFunction(toJSONTransform)) {
        result = toJSONTransform(doc, result, cb);
      }
      return result;
    },
  };

  return { toObject, toJSON };
};

module.exports = {
  createSchemaObject,
  addToSchema,
  addArrayToSchema,
  setTransformers,
};
