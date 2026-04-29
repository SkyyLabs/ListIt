function toPlainObject(doc) {
  if (!doc) {
    return doc;
  }

  return typeof doc.toObject === 'function'
    ? doc.toObject()
    : { ...doc };
}

function getStoredListTitle(record) {
  return record?.titlePlain ?? record?.title ?? null;
}

function getStoredItemText(record) {
  return record?.textPlain ?? record?.text ?? null;
}

function stripListEncryptionFields(record) {
  const plain = toPlainObject(record);
  delete plain.titleEncrypted;
  delete plain.titlePlain;
  delete plain.encryptionState;
  delete plain.encryptionVersion;
  return plain;
}

function stripItemEncryptionFields(record) {
  const plain = toPlainObject(record);
  delete plain.textEncrypted;
  delete plain.textPlain;
  delete plain.encryptionState;
  delete plain.encryptionVersion;
  return plain;
}

module.exports = {
  getStoredItemText,
  getStoredListTitle,
  stripItemEncryptionFields,
  stripListEncryptionFields,
  toPlainObject
};
