const mongoose = require("mongoose");

function createObjectId() {
  return new mongoose.Types.ObjectId().toString();
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return String(path)
    .split(".")
    .reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

function normalizeIdValue(value) {
  if (value && typeof value === "object" && value._id !== undefined) {
    return String(value._id);
  }
  return value == null ? value : String(value);
}

function valuesEqual(a, b) {
  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : new Date(a).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(b).getTime();
    return ta === tb;
  }
  if (a === b) return true;
  if (a == null || b == null) return false;
  return normalizeIdValue(a) === normalizeIdValue(b);
}

function matchesCondition(docValue, condition) {
  if (
    condition !== null &&
    typeof condition === "object" &&
    !(condition instanceof Date) &&
    !(condition instanceof RegExp) &&
    !Array.isArray(condition) &&
    !condition._bsontype
  ) {
    if ("$regex" in condition) {
      const regex =
        condition.$regex instanceof RegExp
          ? condition.$regex
          : new RegExp(condition.$regex, condition.$options || "");
      if (Array.isArray(docValue)) {
        return docValue.some((item) => regex.test(String(item ?? "")));
      }
      return regex.test(String(docValue ?? ""));
    }
    if ("$in" in condition) {
      const list = Array.isArray(condition.$in) ? condition.$in : [];
      if (Array.isArray(docValue)) {
        return docValue.some((item) => list.some((c) => valuesEqual(item, c)));
      }
      return list.some((c) => valuesEqual(docValue, c));
    }
    if ("$nin" in condition) {
      const list = Array.isArray(condition.$nin) ? condition.$nin : [];
      if (Array.isArray(docValue)) {
        return !docValue.some((item) => list.some((c) => valuesEqual(item, c)));
      }
      return !list.some((c) => valuesEqual(docValue, c));
    }
    if ("$ne" in condition) {
      return !valuesEqual(docValue, condition.$ne);
    }
    if ("$gt" in condition || "$gte" in condition || "$lt" in condition || "$lte" in condition) {
      const numVal = docValue instanceof Date ? docValue.getTime() : Number(docValue);
      if (Number.isNaN(numVal)) return false;
      if ("$gt" in condition) {
        const cmp = condition.$gt instanceof Date ? condition.$gt.getTime() : Number(condition.$gt);
        if (!(numVal > cmp)) return false;
      }
      if ("$gte" in condition) {
        const cmp = condition.$gte instanceof Date ? condition.$gte.getTime() : Number(condition.$gte);
        if (!(numVal >= cmp)) return false;
      }
      if ("$lt" in condition) {
        const cmp = condition.$lt instanceof Date ? condition.$lt.getTime() : Number(condition.$lt);
        if (!(numVal < cmp)) return false;
      }
      if ("$lte" in condition) {
        const cmp = condition.$lte instanceof Date ? condition.$lte.getTime() : Number(condition.$lte);
        if (!(numVal <= cmp)) return false;
      }
      return true;
    }
  }

  if (condition instanceof RegExp) {
    return condition.test(String(docValue ?? ""));
  }

  if (Array.isArray(docValue)) {
    return docValue.some((item) => valuesEqual(item, condition));
  }

  return valuesEqual(docValue, condition);
}

function matchesFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, value] of Object.entries(filter)) {
    if (key === "$or") {
      if (!Array.isArray(value) || !value.some((sub) => matchesFilter(doc, sub))) {
        return false;
      }
      continue;
    }
    if (key === "$and") {
      if (!Array.isArray(value) || !value.every((sub) => matchesFilter(doc, sub))) {
        return false;
      }
      continue;
    }
    const docValue = getByPath(doc, key);
    if (!matchesCondition(docValue, value)) {
      return false;
    }
  }
  return true;
}

function cloneValue(val) {
  if (val instanceof Date) return new Date(val.getTime());
  if (Array.isArray(val)) return val.map(cloneValue);
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = cloneValue(v);
    }
    return out;
  }
  return val;
}

function applySelect(doc, selectStr, hiddenFields = new Set()) {
  if (!doc) return cloneValue(doc);
  const tokens = String(selectStr || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const plusFields = new Set(
    tokens.filter((t) => t.startsWith("+")).map((t) => t.slice(1))
  );
  const excludeSet = new Set(
    tokens.filter((t) => t.startsWith("-")).map((t) => t.slice(1))
  );
  const includeTokens = tokens.filter(
    (t) => !t.startsWith("-") && !t.startsWith("+")
  );

  if (includeTokens.length > 0) {
    const result = {};
    if (!excludeSet.has("_id") && doc._id !== undefined) {
      result._id = cloneValue(doc._id);
    }
    for (const field of [...includeTokens, ...plusFields]) {
      if (doc[field] !== undefined) {
        result[field] = cloneValue(doc[field]);
      }
    }
    return result;
  }

  const result = cloneValue(doc);
  for (const hidden of hiddenFields) {
    if (!plusFields.has(hidden)) {
      delete result[hidden];
    }
  }
  for (const field of excludeSet) {
    delete result[field];
  }
  return result;
}

const modelRegistry = new Map();

function getSchemaDefaults(schema) {
  const defaults = {};
  if (schema && schema.paths) {
    for (const [path, schemaType] of Object.entries(schema.paths)) {
      if (path === "_id" || path === "__v") continue;
      if (schemaType && schemaType.options && "default" in schemaType.options) {
        const def = schemaType.options.default;
        defaults[path] = typeof def === "function" ? def() : cloneValue(def);
      }
    }
  }
  return defaults;
}

function getSchemaHiddenFields(schema) {
  const hidden = new Set();
  if (schema && schema.paths) {
    for (const [path, schemaType] of Object.entries(schema.paths)) {
      if (schemaType?.options?.select === false) {
        hidden.add(path);
      }
    }
  }
  return hidden;
}

function getSchemaRefs(schema) {
  const refs = {};
  if (schema && schema.paths) {
    for (const [path, schemaType] of Object.entries(schema.paths)) {
      if (schemaType?.options?.ref) {
        refs[path] = schemaType.options.ref;
      }
    }
  }
  return refs;
}

class MemoryDocument {
  constructor(data, model) {
    Object.assign(this, cloneValue(data));
    Object.defineProperty(this, "__model", {
      value: model,
      enumerable: false,
      writable: false,
    });
  }

  async save() {
    this.updatedAt = new Date();
    const plain = {};
    for (const key of Object.keys(this)) {
      plain[key] = cloneValue(this[key]);
    }
    this.__model._store.set(String(this._id), plain);
    return this;
  }

  toObject() {
    const plain = {};
    for (const key of Object.keys(this)) {
      plain[key] = cloneValue(this[key]);
    }
    return plain;
  }

  toJSON() {
    return this.toObject();
  }
}

class MemoryQuery {
  constructor(executor, isSingle, model) {
    this._executor = executor;
    this._isSingle = isSingle;
    this._model = model;
    this._select = "";
    this._populates = [];
    this._sort = null;
    this._skip = 0;
    this._limit = null;
    this._lean = false;
  }

  select(str) {
    this._select = str;
    return this;
  }

  populate(pathOrOpts, selectStr) {
    if (typeof pathOrOpts === "string") {
      this._populates.push({ path: pathOrOpts, select: selectStr || "" });
    } else if (pathOrOpts && typeof pathOrOpts === "object") {
      this._populates.push(pathOrOpts);
    }
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = Number(n);
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async distinct(field) {
    const docs = await this._executor();
    const arr = Array.isArray(docs) ? docs : docs ? [docs] : [];
    const seen = new Set();
    const out = [];
    for (const doc of arr) {
      const val = doc[field];
      if (val !== undefined) {
        const key = String(val);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(val);
        }
      }
    }
    return out;
  }

  async _populateDoc(doc, popSpec, model) {
    if (!doc || !popSpec || !popSpec.path) return doc;
    const refModelName = model._refs[popSpec.path];
    const refModel = refModelName ? modelRegistry.get(refModelName) : null;
    if (!refModel) return doc;

    const targetId = doc[popSpec.path];
    if (targetId == null) return doc;

    const rawTarget = refModel._store.get(String(targetId));
    if (!rawTarget) {
      doc[popSpec.path] = null;
      return doc;
    }
    if (popSpec.match && !matchesFilter(rawTarget, popSpec.match)) {
      doc[popSpec.path] = null;
      return doc;
    }

    let populated = applySelect(rawTarget, popSpec.select || "", refModel._hiddenFields);

    if (popSpec.populate) {
      const nestedSpecs = Array.isArray(popSpec.populate)
        ? popSpec.populate
        : [popSpec.populate];
      for (const nested of nestedSpecs) {
        populated = await this._populateDoc(populated, nested, refModel);
      }
    }

    doc[popSpec.path] = populated;
    return doc;
  }

  async exec() {
    const raw = await this._executor();
    if (this._isSingle) {
      if (!raw) return null;
      let doc = applySelect(raw, this._select, this._model._hiddenFields);
      for (const pop of this._populates) {
        doc = await this._populateDoc(doc, pop, this._model);
      }
      return this._lean ? doc : new MemoryDocument(doc, this._model);
    }

    let list = Array.isArray(raw) ? raw.map((item) => cloneValue(item)) : [];
    if (this._sort) {
      const entries = Object.entries(this._sort);
      list.sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = a[field];
          const bv = b[field];
          if (av == null && bv == null) continue;
          if (av == null) return dir > 0 ? -1 : 1;
          if (bv == null) return dir > 0 ? 1 : -1;
          const aComp = av instanceof Date ? av.getTime() : av;
          const bComp = bv instanceof Date ? bv.getTime() : bv;
          if (aComp < bComp) return dir > 0 ? -1 : 1;
          if (aComp > bComp) return dir > 0 ? 1 : -1;
        }
        return 0;
      });
    }

    if (this._skip > 0) {
      list = list.slice(this._skip);
    }
    if (this._limit !== null && this._limit >= 0) {
      list = list.slice(0, this._limit);
    }

    const output = [];
    for (const item of list) {
      let doc = applySelect(item, this._select, this._model._hiddenFields);
      for (const pop of this._populates) {
        doc = await this._populateDoc(doc, pop, this._model);
      }
      output.push(this._lean ? doc : new MemoryDocument(doc, this._model));
    }
    return output;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

function createDuplicateError(message = "Duplicate key error") {
  const err = new Error(message);
  err.code = 11000;
  return err;
}

function createMemoryModel(name, schema, uniqueChecks = []) {
  const store = new Map();
  const defaults = getSchemaDefaults(schema);
  const hiddenFields = getSchemaHiddenFields(schema);
  const refs = getSchemaRefs(schema);

  const model = {
    modelName: name,
    _store: store,
    _refs: refs,
    _defaults: defaults,
    _hiddenFields: hiddenFields,
    _uniqueChecks: uniqueChecks,

    _prepareNew(data) {
      const now = new Date();
      const base = cloneValue(defaults);
      const doc = {
        ...base,
        ...cloneValue(data),
      };
      if (!doc._id) {
        doc._id = createObjectId();
      } else {
        doc._id = String(doc._id);
      }
      if (doc.email && typeof doc.email === "string") {
        doc.email = doc.email.trim().toLowerCase();
      }
      if (!doc.createdAt) doc.createdAt = now;
      if (!doc.updatedAt) doc.updatedAt = now;
      return doc;
    },

    _checkUnique(candidate, ignoreId = null) {
      for (const fields of uniqueChecks) {
        for (const existing of store.values()) {
          if (ignoreId && String(existing._id) === String(ignoreId)) continue;
          const allMatch = fields.every(
            (f) => candidate[f] !== undefined && valuesEqual(existing[f], candidate[f])
          );
          if (allMatch) {
            throw createDuplicateError(`Duplicate key on ${fields.join(", ")}`);
          }
        }
      }
    },

    _applyUpdate(target, update) {
      const next = cloneValue(target);
      if (update && typeof update === "object") {
        if (update.$set) {
          for (const [k, v] of Object.entries(update.$set)) {
            next[k] = cloneValue(v);
          }
        }
        if (update.$inc) {
          for (const [k, delta] of Object.entries(update.$inc)) {
            next[k] = Number(next[k] || 0) + Number(delta);
          }
        }
        for (const [k, v] of Object.entries(update)) {
          if (!k.startsWith("$")) {
            next[k] = cloneValue(v);
          }
        }
      }
      next.updatedAt = new Date();
      return next;
    },

    find(filter = {}) {
      return new MemoryQuery(
        async () => Array.from(store.values()).filter((d) => matchesFilter(d, filter)),
        false,
        model
      );
    },

    findOne(filter = {}) {
      return new MemoryQuery(
        async () => Array.from(store.values()).find((d) => matchesFilter(d, filter)) || null,
        true,
        model
      );
    },

    findById(id) {
      return new MemoryQuery(
        async () => (id == null ? null : store.get(String(id)) || null),
        true,
        model
      );
    },

    async create(data) {
      const doc = model._prepareNew(data);
      model._checkUnique(doc);
      store.set(String(doc._id), doc);
      return new MemoryDocument(doc, model);
    },

    async exists(filter = {}) {
      const found = Array.from(store.values()).find((d) => matchesFilter(d, filter));
      return found ? { _id: found._id } : null;
    },

    async countDocuments(filter = {}) {
      let count = 0;
      for (const doc of store.values()) {
        if (matchesFilter(doc, filter)) count += 1;
      }
      return count;
    },

    findOneAndUpdate(filter, update, opts = {}) {
      return new MemoryQuery(
        async () => {
          const existing = Array.from(store.values()).find((d) => matchesFilter(d, filter));
          if (!existing) {
            if (!opts.upsert) return null;
            const seed = {};
            for (const [k, v] of Object.entries(filter || {})) {
              if (!k.startsWith("$") && (typeof v !== "object" || v === null)) {
                seed[k] = v;
              }
            }
            const created = model._prepareNew({
              ...seed,
              ...(update?.$set || {}),
            });
            model._checkUnique(created);
            store.set(String(created._id), created);
            return created;
          }
          const updated = model._applyUpdate(existing, update);
          model._checkUnique(updated, existing._id);
          store.set(String(existing._id), updated);
          return opts.new ? updated : existing;
        },
        true,
        model
      );
    },

    findByIdAndUpdate(id, update, opts = {}) {
      return model.findOneAndUpdate({ _id: String(id) }, update, opts);
    },

    findOneAndDelete(filter) {
      return new MemoryQuery(
        async () => {
          const existing = Array.from(store.values()).find((d) => matchesFilter(d, filter));
          if (!existing) return null;
          store.delete(String(existing._id));
          return existing;
        },
        true,
        model
      );
    },

    findByIdAndDelete(id) {
      return model.findOneAndDelete({ _id: String(id) });
    },

    async updateOne(filter, update) {
      const existing = Array.from(store.values()).find((d) => matchesFilter(d, filter));
      if (!existing) return { matchedCount: 0, modifiedCount: 0 };
      const updated = model._applyUpdate(existing, update);
      store.set(String(existing._id), updated);
      return { matchedCount: 1, modifiedCount: 1 };
    },

    async deleteOne(filter) {
      const existing = Array.from(store.values()).find((d) => matchesFilter(d, filter));
      if (!existing) return { deletedCount: 0 };
      store.delete(String(existing._id));
      return { deletedCount: 1 };
    },

    async deleteMany(filter = {}) {
      let deletedCount = 0;
      for (const [id, doc] of Array.from(store.entries())) {
        if (matchesFilter(doc, filter)) {
          store.delete(id);
          deletedCount += 1;
        }
      }
      return { deletedCount };
    },

    async aggregate(pipeline = []) {
      let rows = Array.from(store.values()).map((d) => cloneValue(d));
      for (const stage of pipeline) {
        if (stage.$match) {
          rows = rows.filter((d) => matchesFilter(d, stage.$match));
        } else if (stage.$group) {
          const groupSpec = stage.$group;
          const groupKeyPath =
            typeof groupSpec._id === "string" && groupSpec._id.startsWith("$")
              ? groupSpec._id.slice(1)
              : null;
          const groups = new Map();
          for (const row of rows) {
            const keyVal = groupKeyPath ? row[groupKeyPath] : groupSpec._id;
            const mapKey = String(keyVal);
            if (!groups.has(mapKey)) {
              groups.set(mapKey, { _id: keyVal, items: [] });
            }
            groups.get(mapKey).items.push(row);
          }
          const result = [];
          for (const { _id, items } of groups.values()) {
            const out = { _id };
            for (const [field, op] of Object.entries(groupSpec)) {
              if (field === "_id") continue;
              if (op && typeof op === "object") {
                if ("$sum" in op) {
                  if (typeof op.$sum === "number") {
                    out[field] = items.length * op.$sum;
                  } else if (typeof op.$sum === "string" && op.$sum.startsWith("$")) {
                    const p = op.$sum.slice(1);
                    out[field] = items.reduce((s, r) => s + Number(r[p] || 0), 0);
                  }
                } else if ("$avg" in op && typeof op.$avg === "string" && op.$avg.startsWith("$")) {
                  const p = op.$avg.slice(1);
                  const sum = items.reduce((s, r) => s + Number(r[p] || 0), 0);
                  out[field] = items.length ? sum / items.length : 0;
                }
              }
            }
            result.push(out);
          }
          rows = result;
        }
      }
      return rows;
    },
  };

  modelRegistry.set(name, model);
  return model;
}

module.exports = {
  createMemoryModel,
  modelRegistry,
  matchesFilter,
};
