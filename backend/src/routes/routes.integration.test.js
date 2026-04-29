const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { PassThrough, Readable, Writable } = require('node:stream');
const Category = require('../models/Category');
const Item = require('../models/Item');
const List = require('../models/List');
const ListInvitation = require('../models/ListInvitation');
const ListReaction = require('../models/ListReaction');
const { errorHandler } = require('../middlewares/errorHandler');

const authModulePath = require.resolve('../middlewares/auth');
const categoriesRoutePath = require.resolve('./categories');
const itemsRoutePath = require.resolve('./items');
const listsRoutePath = require.resolve('./lists');

let app;
let originalCategoryFindById;
let originalItemFind;
let originalItemFindById;
let originalListFindById;
let originalItemCountDocuments;
let originalListFind;
let originalListInvitationFind;
let originalListReactionFind;
let originalListReactionFindOneAndUpdate;
let originalListReactionDeleteOne;
let originalListCreate;
let originalItemInsertMany;

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
  originalItemFind = Item.find;
  originalItemFindById = Item.findById;
  originalListFindById = List.findById;
  originalListFind = List.find;
  originalListInvitationFind = ListInvitation.find;
  originalItemCountDocuments = Item.countDocuments;
  originalListReactionFind = ListReaction.find;
  originalListReactionFindOneAndUpdate = ListReaction.findOneAndUpdate;
  originalListReactionDeleteOne = ListReaction.deleteOne;
  originalListCreate = List.create;
  originalItemInsertMany = Item.insertMany;
});

test.after(() => {
  Category.findById = originalCategoryFindById;
  Item.find = originalItemFind;
  Item.findById = originalItemFindById;
  List.findById = originalListFindById;
  List.find = originalListFind;
  ListInvitation.find = originalListInvitationFind;
  Item.countDocuments = originalItemCountDocuments;
  ListReaction.find = originalListReactionFind;
  ListReaction.findOneAndUpdate = originalListReactionFindOneAndUpdate;
  ListReaction.deleteOne = originalListReactionDeleteOne;
  List.create = originalListCreate;
  Item.insertMany = originalItemInsertMany;
  delete require.cache[authModulePath];
  delete require.cache[categoriesRoutePath];
  delete require.cache[itemsRoutePath];
  delete require.cache[listsRoutePath];
});

test.beforeEach(() => {
  app = buildApp();

  Category.findById = async () => ({
    _id: 'cat-1',
    ownerUid: 'owner-1',
    remove: async () => {}
  });

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

  List.findById = listId => ({
    lean: async () => ({
      _id: listId,
      ownerUid: 'owner-1',
      collaborators: ['collab-1'],
      isPublic: false
    }),
    remove: async () => {}
  });

  Item.countDocuments = async () => 0;
  List.find = () => ({
    select() {
      return this;
    },
    lean: async () => []
  });
  ListReaction.find = () => ({
    lean: async () => []
  });
  ListInvitation.find = () => ({
    select() {
      return this;
    },
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

test('DELETE /lists/:id/collaborators/:collabUid allows an EDIT_ALL collaborator to remove another collaborator', async () => {
  let savedCollaborators;
  List.findById = async () => ({
    _id: 'list-1',
    ownerUid: 'owner-1',
    collaborators: [
      { uid: 'collab-1', permissions: ['READ', 'EDIT_ALL'] },
      { uid: 'stranger-1', permissions: ['READ'] }
    ],
    save: async function save() {
      savedCollaborators = this.collaborators;
      return this;
    }
  });

  const { status, text } = await request('/lists/list-1/collaborators/stranger-1', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer collabToken'
    }
  });

  assert.equal(status, 200);
  assert.deepEqual(savedCollaborators.map(collaborator => collaborator.uid), ['collab-1']);
  assert.deepEqual(JSON.parse(text).collaborators.map(collaborator => collaborator.uid), ['collab-1']);
});

test('DELETE /lists/:id/collaborators/:collabUid rejects a READ collaborator', async () => {
  List.findById = async () => ({
    _id: 'list-1',
    ownerUid: 'owner-1',
    collaborators: [
      { uid: 'collab-1', permissions: ['READ'] },
      { uid: 'stranger-1', permissions: ['READ'] }
    ],
    save: async function save() {
      return this;
    }
  });

  const { status, text } = await request('/lists/list-1/collaborators/stranger-1', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer collabToken'
    }
  });

  assert.equal(status, 403);
  assert.equal(text, 'Forbidden');
});

test('DELETE /lists/:id/collaborators/:collabUid never removes the owner', async () => {
  List.findById = async () => ({
    _id: 'list-1',
    ownerUid: 'owner-1',
    collaborators: [
      { uid: 'collab-1', permissions: ['READ', 'EDIT_ALL'] }
    ],
    save: async function save() {
      return this;
    }
  });

  const { status, text } = await request('/lists/list-1/collaborators/owner-1', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer ownerToken'
    }
  });

  assert.equal(status, 400);
  assert.equal(text, 'Owner cannot be removed as a collaborator');
});

test('POST /lists/:id/collaborators does not add the owner as a collaborator', async () => {
  List.findById = async () => ({
    _id: 'list-1',
    ownerUid: 'owner-1',
    collaborators: [],
    save: async function save() {
      return this;
    }
  });

  const { status, text } = await request('/lists/list-1/collaborators', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ownerToken',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ uid: 'owner-1' })
  });

  assert.equal(status, 400);
  assert.equal(text, 'Owner cannot be added as a collaborator');
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
  List.findById = () => ({
    lean: async () => ({
      _id: 'list-1',
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
        listId: 'list-1',
        text: 'Kedarnath',
        subCategory: 'North India',
        addedBy: 'owner-1',
        doneBy: ['collab-1']
      },
      {
        _id: 'item-2',
        listId: 'list-1',
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
