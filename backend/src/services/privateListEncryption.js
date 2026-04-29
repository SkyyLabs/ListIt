const {
  decryptString,
  encryptString
} = require('./cryptoService');
const {
  getStoredItemText,
  getStoredListTitle,
  stripItemEncryptionFields,
  stripListEncryptionFields,
  toPlainObject
} = require('../utils/encryptionPayload');
const { createHttpError } = require('../utils/http');

function buildListTitleContext(listId) {
  return {
    resourceType: 'listTitle',
    resourceId: String(listId),
    visibility: 'private'
  };
}

function buildItemTextContext(itemId, listId) {
  return {
    resourceType: 'itemText',
    resourceId: String(itemId),
    listId: String(listId),
    visibility: 'private'
  };
}

async function encryptListTitle(listId, title) {
  return encryptString(title, buildListTitleContext(listId));
}

async function decryptListTitle(listId, payload) {
  return decryptString(payload, buildListTitleContext(listId));
}

async function encryptItemText(itemId, listId, text) {
  return encryptString(text, buildItemTextContext(itemId, listId));
}

async function decryptItemText(itemId, listId, payload) {
  return decryptString(payload, buildItemTextContext(itemId, listId));
}

async function ensureListTitle(list) {
  if (!list) {
    return null;
  }
  if (list.isPublic) {
    return getStoredListTitle(list);
  }
  if (list.encryptionState !== 'encrypted' || !list.titleEncrypted) {
    throw createHttpError(500, 'Private list is missing encrypted title data');
  }
  return decryptListTitle(list._id, list.titleEncrypted);
}

async function ensureItemText(item) {
  if (!item) {
    return null;
  }
  if (item.encryptionState === 'plaintext') {
    return getStoredItemText(item);
  }
  if (item.encryptionState !== 'encrypted' || !item.textEncrypted) {
    throw createHttpError(500, 'Encrypted item is missing encrypted text data');
  }
  return decryptItemText(item._id, item.listId, item.textEncrypted);
}

async function serializeListForResponse(list) {
  const plain = stripListEncryptionFields(list);
  plain.title = await ensureListTitle(list);
  return plain;
}

async function serializeItemForResponse(item) {
  const plain = stripItemEncryptionFields(item);
  plain.text = await ensureItemText(item);
  return plain;
}

function applyPlaintextListState(list, title) {
  list.title = title;
  list.titlePlain = title;
  list.titleEncrypted = null;
  list.encryptionState = 'plaintext';
  list.encryptionVersion = null;
}

function applyEncryptedListState(list, encryptedTitle) {
  list.title = null;
  list.titlePlain = null;
  list.titleEncrypted = encryptedTitle;
  list.encryptionState = 'encrypted';
  list.encryptionVersion = encryptedTitle?.version || 'v1';
}

function applyPlaintextItemState(item, text) {
  item.text = text;
  item.textPlain = text;
  item.textEncrypted = null;
  item.encryptionState = 'plaintext';
  item.encryptionVersion = null;
}

function applyEncryptedItemState(item, encryptedText) {
  item.text = null;
  item.textPlain = null;
  item.textEncrypted = encryptedText;
  item.encryptionState = 'encrypted';
  item.encryptionVersion = encryptedText?.version || 'v1';
}

async function prepareListForPrivateStorage(list, title = getStoredListTitle(list)) {
  const encryptedTitle = title
    ? await encryptListTitle(list._id, title)
    : null;
  applyEncryptedListState(list, encryptedTitle);
  return list;
}

async function prepareItemForPrivateStorage(item, listId = item.listId, text = getStoredItemText(item)) {
  const encryptedText = text
    ? await encryptItemText(item._id, listId, text)
    : null;
  applyEncryptedItemState(item, encryptedText);
  return item;
}

async function convertListToPrivate(list, items = []) {
  const listTitle = await ensureListTitle(list);
  await prepareListForPrivateStorage(list, listTitle);

  for (const item of items) {
    const itemText = await ensureItemText(item);
    await prepareItemForPrivateStorage(item, item.listId, itemText);
  }
}

async function convertListToPublic(list, items = []) {
  applyPlaintextListState(list, await ensureListTitle(list));

  for (const item of items) {
    applyPlaintextItemState(item, await ensureItemText(item));
  }
}

async function prepareNewListForStorage(list) {
  if (list.isPublic) {
    applyPlaintextListState(list, getStoredListTitle(list));
    return;
  }

  await prepareListForPrivateStorage(list);
}

async function prepareNewItemForStorage(item, parentList) {
  if (parentList.isPublic) {
    applyPlaintextItemState(item, getStoredItemText(item));
    return;
  }

  await prepareItemForPrivateStorage(item, item.listId, getStoredItemText(item));
}

async function normalizePrivateListForStorage(list, items = []) {
  await convertListToPrivate(list, items);
}

async function normalizePublicListForStorage(list, items = []) {
  await convertListToPublic(list, items);
}

async function cloneListSnapshotForDuplicate(sourceList) {
  return {
    ...toPlainObject(sourceList),
    title: await ensureListTitle(sourceList)
  };
}

async function cloneItemsSnapshotForDuplicate(items) {
  return Promise.all(items.map(async item => ({
    ...toPlainObject(item),
    text: await ensureItemText(item)
  })));
}

module.exports = {
  cloneItemsSnapshotForDuplicate,
  cloneListSnapshotForDuplicate,
  convertListToPrivate,
  convertListToPublic,
  decryptItemText,
  decryptListTitle,
  encryptItemText,
  encryptListTitle,
  ensureItemText,
  ensureListTitle,
  normalizePrivateListForStorage,
  normalizePublicListForStorage,
  prepareNewItemForStorage,
  prepareNewListForStorage,
  serializeItemForResponse,
  serializeListForResponse
};
