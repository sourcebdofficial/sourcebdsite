const mongoose = require("mongoose");
const { createMemoryModel } = require("./memory-store");

let useMemoryMode = !process.env.MONGODB_URI;

const registeredModels = [];

function createModel(name, schema, uniqueChecks = []) {
  const realModel = mongoose.models[name] || mongoose.model(name, schema);
  const memoryModel = createMemoryModel(name, schema, uniqueChecks);
  registeredModels.push({ name, realModel, memoryModel });

  return new Proxy(
    {},
    {
      get(_, prop) {
        const target = useMemoryMode ? memoryModel : realModel;
        const val = target[prop];
        return typeof val === "function" ? val.bind(target) : val;
      },
    }
  );
}

function setMemoryMode(enabled) {
  useMemoryMode = Boolean(enabled);
}

function isMemoryMode() {
  return useMemoryMode;
}

module.exports = {
  createModel,
  setMemoryMode,
  isMemoryMode,
};
