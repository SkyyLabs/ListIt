const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const { PassThrough, Readable, Writable } = require('node:stream');
const Category = require('../models/Category');
const Item = require('../models/Item');
const List = require('../models/List');
const ListReaction = require('../models/ListReaction');
const { errorHandler } = require('../middlewares/errorHandler');

const authModulePath = require.resolve('../middlewares/auth');
const categoriesRoutePath = require.resolve('./categories');
const itemsRoutePath = require.resolve('./items');
const listsRoutePath = require.resolve('./lists');
const privateListEncryptionPath = require.resolve('../services/privateListEncryption');

let app;
let originalCategoryFindById;
let originalCategoryFindOne;
let originalItemFind;
let originalItemFindById;
let originalListFindById;
let originalItemCountDocuments;
let originalListFind;
let originalListReactionFind;
let originalListReactionFindOneAndUpdate;
let originalListReactionDeleteOne;
let originalListCreate;
let originalItemInsertMany;
let originalListPrototypeSave;
let originalItemPrototypeSave;
let originalCategoryPrototypeSave;
let originalMongooseStartSession;

function createRequest({ method, pathName, headers = {}, body }) {
  const normalizedHeaders = { ...headers };
  if (body && !normalizedHeaders['content-length']) {
    normalizedHeaders['content-length'] = Buffer.byteLength(body).toString();
  }

  const req = new Readable({
    read() {
      if (body) {
        this.push(body);
      }
      this.push(null);
    }
  });

  req.method = method;
  req.url = pathName;
  req.headers = normalizedHeaders;
  const socket = new PassThrough();
  socket.destroy = () => {};
  req.connection = socket;
  req.socket = socket;

  return req;
}

function createResponse(resolve) {
  const chunks = [];

  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    }
  });

  res.statusCode = 200;
  res.headers = {};

  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value;
  };
  res.getHeader = name => res.headers[name.toLowerCase()];
  res.removeHeader = name => {
    delete res.headers[name.toLowerCase()];
  };
  res.writeHead = (statusCode, headers = {}) => {
    res.statusCode = statusCode;
    Object.entries(headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });
  };
  res.end = chunk => {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    resolve({
      status: res.statusCode,
      headers: res.headers,
      text: Buffer.concat(chunks).toString('utf8')
    });
  };

  return res;
}

function request(pathName, options = {}) {
  return new Promise(resolve => {
    const req = createRequest({
      method: options.method || 'GET',
      pathName,
      headers: options.headers || {},
      body: options.body
    });
    const res = createResponse(resolve);
    app.handle(req, res);
  });
}

function buildApp() {
  const usersByToken = {
    ownerToken: { uid: 'owner-1' },
    collabToken: { uid: 'collab-1' },
    strangerToken: { uid: 'stranger-1' },
    adminToken: { uid: 'admin-1', admin: true }
  };

  require.cache[authModulePath] = {
    id: authModulePath,
    filename: authModulePath,
    loaded: true,
    exports: {
      authenticate(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];
        const user = usersByToken[token];
        if (!user) {
          return next(Object.assign(new Error('Unauthorized'), { status: 401 }));
        }
        req.user = user;
        return next();
      },
      optionalAuth(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];
        if (token && usersByToken[token]) {
          req.user = usersByToken[token];
        }
        next();
      }
    }
  };

  require.cache[privateListEncryptionPath] = {
    id: privateListEncryptionPath,
    filename: privateListEncryptionPath,
    loaded: true,
    exports: {
      async cloneItemsSnapshotForDuplicate(items) {
        return items;
      },
      async cloneListSnapshotForDuplicate(list) {
        return {
          ...list,
          title: list.titlePlain ?? list.title ?? null
        };
      },
      async convertListToPrivate(list, items = []) {
        const title = list.titlePlain ?? list.title ?? null;
        list.titleEncrypted = title
          ? { version: 'v1', ciphertext_b64: Buffer.from(title).toString('base64') }
          : null;
        list.titlePlain = null;
        list.title = null;
        list.encryptionState = 'encrypted';
        list.encryptionVersion = 'v1';

        items.forEach(item => {
          const text = item.textPlain ?? item.text ?? null;
          item.textEncrypted = text
            ? { version: 'v1', ciphertext_b64: Buffer.from(text).toString('base64') }
            : null;
          item.textPlain = null;
          item.text = null;
          item.encryptionState = 'encrypted';
          item.encryptionVersion = 'v1';
        });
      },
      async normalizePublicListForStorage(list, items = []) {
        list.titlePlain = list.titlePlain ?? list.title ?? 'Recovered';
        list.title = list.titlePlain;
        list.titleEncrypted = null;
        list.encryptionState = 'plaintext';
        list.encryptionVersion = null;

        items.forEach(item => {
          item.textPlain = item.textPlain ?? item.text ?? 'Recovered';
          item.text = item.textPlain;
          item.textEncrypted = null;
          item.encryptionState = 'plaintext';
          item.encryptionVersion = null;
        });
      },
      async prepareNewItemForStorage(item, parentList) {
        if (parentList.isPublic) {
          item.textPlain = item.text;
          item.textEncrypted = null;
          item.text = item.textPlain;
          item.encryptionState = 'plaintext';
          item.encryptionVersion = null;
          return;
        }
        item.textEncrypted = {
          version: 'v1',
          ciphertext_b64: Buffer.from(item.text ?? item.textPlain ?? '').toString('base64')
        };
        item.text = null;
        item.textPlain = null;
        item.encryptionState = 'encrypted';
        item.encryptionVersion = 'v1';
      },
      async prepareNewListForStorage(list) {
        if (list.isPublic) {
          list.titlePlain = list.title;
          list.titleEncrypted = null;
          list.title = list.titlePlain;
          list.encryptionState = 'plaintext';
          list.encryptionVersion = null;
          return;
        }
        list.titleEncrypted = {
          version: 'v1',
          ciphertext_b64: Buffer.from(list.title ?? list.titlePlain ?? '').toString('base64')
        };
        list.title = null;
        list.titlePlain = null;
        list.encryptionState = 'encrypted';
        list.encryptionVersion = 'v1';
      },
      async normalizePrivateListForStorage(list, items = []) {
        const title = list.titlePlain ?? list.title ?? null;
        list.titleEncrypted = title
          ? { version: 'v1', ciphertext_b64: Buffer.from(title).toString('base64') }
          : null;
        list.titlePlain = null;
        list.title = null;
        list.encryptionState = 'encrypted';
        list.encryptionVersion = 'v1';

        items.forEach(item => {
          const text = item.textPlain ?? item.text ?? null;
          item.textEncrypted = text
            ? { version: 'v1', ciphertext_b64: Buffer.from(text).toString('base64') }
            : null;
          item.textPlain = null;
          item.text = null;
          item.encryptionState = 'encrypted';
          item.encryptionVersion = 'v1';
        });
      },
      async serializeItemForResponse(item) {
        const plain = typeof item.toObject === 'function' ? item.toObject() : { ...item };
        plain.text = plain.textPlain ?? plain.text ?? 'decrypted-item';
        delete plain.textEncrypted;
        delete plain.textPlain;
        delete plain.encryptionState;
        delete plain.encryptionVersion;
        return plain;
      },
      async serializeListForResponse(list) {
        const plain = typeof list.toObject === 'function' ? list.toObject() : { ...list };
        plain.title = plain.titlePlain ?? plain.title ?? 'decrypted-list';
        delete plain.titleEncrypted;
        delete plain.titlePlain;
        delete plain.encryptionState;
        delete plain.encryptionVersion;
        return plain;
      }
    }
  };

  delete require.cache[categoriesRoutePath];
  delete require.cache[itemsRoutePath];
  delete require.cache[listsRoutePath];

  const categoriesRouter = require('./categories');
  const itemsRouter = require('./items');
  const listsRouter = require('./lists');

  const nextApp = express();
  nextApp.use(express.json());
  nextApp.use('/categories', categoriesRouter);
  nextApp.use('/items', itemsRouter);
  nextApp.use('/lists', listsRouter);
  nextApp.use(errorHandler);
  return nextApp;
}

test.before(() => {
  originalCategoryFindById = Category.findById;
  originalCategoryFindOne = Category.findOne;
  originalItemFind = Item.find;
  originalItemFindById = Item.findById;
  originalListFindById = List.findById;
  originalListFind = List.find;
  originalItemCountDocuments = Item.countDocuments;
  originalListReactionFind = ListReaction.find;
  originalListReactionFindOneAndUpdate = ListReaction.findOneAndUpdate;
  originalListReactionDeleteOne = ListReaction.deleteOne;
  originalListCreate = List.create;
  originalItemInsertMany = Item.insertMany;
  originalListPrototypeSave = List.prototype.save;
  originalItemPrototypeSave = Item.prototype.save;
  originalCategoryPrototypeSave = Category.prototype.save;
  originalMongooseStartSession = mongoose.startSession;
});

test.after(() => {
  Category.findById = originalCategoryFindById;
  Category.findOne = originalCategoryFindOne;
  Item.find = originalItemFind;
  Item.findById = originalItemFindById;
  List.findById = originalListFindById;
  List.find = originalListFind;
  Item.countDocuments = originalItemCountDocuments;
  ListReaction.find = originalListReactionFind;
  ListReaction.findOneAndUpdate = originalListReactionFindOneAndUpdate;
  ListReaction.deleteOne = originalListReactionDeleteOne;
  List.create = originalListCreate;
  Item.insertMany = originalItemInsertMany;
  List.prototype.save = originalListPrototypeSave;
  Item.prototype.save = originalItemPrototypeSave;
  Category.prototype.save = originalCategoryPrototypeSave;
  mongoose.startSession = originalMongooseStartSession;
  delete require.cache[authModulePath];
  delete require.cache[privateListEncryptionPath];
  delete require.cache[categoriesRoutePath];
  delete require.cache[itemsRoutePath];
  delete require.cache[listsRoutePath];
});

test.beforeEach(() => {
  app = buildApp();

  Category.findById = async () => ({
    _id: 'cat-1',
    ownerUid: 'owner-1',
    subCategories: [],
    save: async function save() {
      return this;
    },
    remove: async () => {}
  });
  Category.findOne = async () => ({ _id: 'cat-1', name: 'Other' });
  Category.prototype.save = async function save() {
    return this;
  };

  Item.find = () => ({
    lean: async () => [{ _id: 'item-1', doneBy: ['collab-1'], text: 'Milk' }]
  });

  Item.findById = async () => ({
    _id: 'item-1',
    listId: 'list-1',
    addedBy: 'owner-1',
    doneBy: [],
    remove: async () => {},
    save: async function save() {
      return this;
    },
    toObject() {
      return {
        _id: this._id,
        listId: this.listId,
        addedBy: this.addedBy,
        doneBy: this.doneBy
      };
    }
  });

  List.prototype.save = async function save() {
    return this;
  };
  Item.prototype.save = async function save() {
    return this;
  };

  List.findById = listId => ({
    lean: async () => ({
      _id: listId,
      categoryId: 'cat-1',
      ownerUid: 'owner-1',
      collaborators: ['collab-1'],
      isPublic: false
    }),
    remove: async () => {}
  });

  mongoose.startSession = async () => ({
    async withTransaction(work) {
      return work();
    },
    async endSession() {}
  });

  Item.countDocuments = async () => 0;
  List.find = () => ({
    populate() {
      return this;
    },
    select() {
      return this;
    },
    lean: async () => []
  });
  ListReaction.find = () => ({
    lean: async () => []
  });
  ListReaction.findOneAndUpdate = async () => ({});
  ListReaction.deleteOne = async () => ({ deletedCount: 1 });
  List.create = async payload => ({
    _id: 'duplicated-list-1',
    ...payload,
    toObject() {
      return { _id: this._id, ...payload };
    }
  });
  Item.insertMany = async docs => docs;
});

test('GET /items/:listId rejects a stranger from a private list', async () => {
  const { status, text } = await request('/items/list-1', {
    headers: {
      authorization: 'Bearer strangerToken'
    }
  });

  assert.equal(status, 403);
  assert.equal(text, 'Forbidden');
});

test('GET /items/:listId allows a collaborator on a private list', async () => {
  const { status, text } = await request('/items/list-1', {
    headers: {
      authorization: 'Bearer collabToken'
    }
  });

  assert.equal(status, 200);
  const items = JSON.parse(text);
  assert.equal(items.length, 1);
  assert.equal(items[0].done, true);
  assert.equal(items[0].text, 'Milk');
});

test('DELETE /categories/:id rejects a non-admin user', async () => {
  const { status, text } = await request('/categories/cat-1', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer ownerToken'
    }
  });

  assert.equal(status, 403);
  assert.equal(text, 'Only admins may delete categories');
});

test('DELETE /categories/:id allows an admin user', async () => {
  const { status } = await request('/categories/cat-1', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer adminToken'
    }
  });

  assert.equal(status, 204);
});

test('DELETE /lists/:id blocks an owner when foreign items exist', async () => {
  Item.countDocuments = async () => 2;
  List.findById = async () => ({
    _id: 'list-1',
    ownerUid: 'owner-1',
    isPublic: false,
    remove: async () => {}
  });

  const { status, text } = await request('/lists/list-1', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer ownerToken'
    }
  });

  assert.equal(status, 403);
  assert.equal(text, 'Forbidden');
});

test('PUT /lists/:id/reaction supports legacy string collaborators without saving the list', async () => {
  List.findById = async listId => ({
    _id: listId,
    ownerUid: 'owner-1',
    collaborators: ['collab-1'],
    isPublic: false,
    toObject() {
      return {
        _id: listId,
        ownerUid: 'owner-1',
        collaborators: ['collab-1'],
        isPublic: false
      };
    }
  });

  const { status, text } = await request('/lists/list-1/reaction', {
    method: 'PUT',
    headers: {
      authorization: 'Bearer collabToken',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ reaction: 'like' })
  });

  assert.equal(status, 200);
  const list = JSON.parse(text);
  assert.equal(list.currentUserReaction, null);
});

test('POST /lists/:id/duplicate creates a private personal copy with only current user progress', async () => {
  const sourceListId = '507f191e810c19729de860ea';
  List.findById = () => ({
    lean: async () => ({
      _id: sourceListId,
      title: 'Treks',
      categoryId: 'cat-1',
      ownerUid: 'owner-1',
      isPublic: true,
      collaborators: []
    })
  });

  Item.find = () => ({
    lean: async () => [
      {
        _id: 'item-1',
        listId: sourceListId,
        text: 'Kedarnath',
        subCategory: 'North India',
        addedBy: 'owner-1',
        doneBy: ['collab-1']
      },
      {
        _id: 'item-2',
        listId: sourceListId,
        text: 'Triund',
        subCategory: 'North India',
        addedBy: 'owner-1',
        doneBy: []
      }
    ]
  });

  let insertedItems;
  Item.insertMany = async docs => {
    insertedItems = docs;
    return docs;
  };

  const { status, text } = await request('/lists/list-1/duplicate', {
    method: 'POST',
    headers: {
      authorization: 'Bearer collabToken'
    }
  });

  assert.equal(status, 201);
  const duplicatedList = JSON.parse(text);
  assert.equal(duplicatedList.ownerUid, 'collab-1');
  assert.equal(duplicatedList.isPublic, false);
  assert.equal(duplicatedList.source.title, 'Treks');
  assert.equal(duplicatedList.source.ownerUid, 'owner-1');
  assert.equal(insertedItems.length, 2);
  assert.deepEqual(insertedItems.map(item => item.addedBy), ['collab-1', 'collab-1']);
  assert.deepEqual(insertedItems.map(item => item.doneBy), [['collab-1'], []]);
});

test('POST /lists creates an encrypted private list and returns plaintext title', async () => {
  const saves = [];
  List.prototype.save = async function save() {
    saves.push(this.toObject());
    return this;
  };

  const { status, text } = await request('/lists', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ownerToken',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Secrets',
      categoryName: 'Other',
      isPublic: false
    })
  });

  assert.equal(status, 201);
  const payload = JSON.parse(text);
  assert.equal(payload.title, 'decrypted-list');
  assert.equal(payload.ownerUid, 'owner-1');
  assert.equal(saves.length, 1);
  assert.equal(saves[0].title, null);
  assert.equal(saves[0].titlePlain, null);
  assert.ok(saves[0].titleEncrypted);
});

test('POST /items creates an encrypted private item without plaintext persistence', async () => {
  const saves = [];
  Item.prototype.save = async function save() {
    saves.push(this.toObject());
    return this;
  };

  const { status, text } = await request('/items', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ownerToken',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      listId: 'list-1',
      text: 'Hidden step',
      subCategory: 'Misc'
    })
  });

  assert.equal(status, 201);
  const payload = JSON.parse(text);
  assert.equal(payload.text, 'decrypted-item');
  assert.equal(saves.length, 1);
  assert.equal(saves[0].text, null);
  assert.equal(saves[0].textPlain, null);
  assert.ok(saves[0].textEncrypted);
});
