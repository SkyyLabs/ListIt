require('dotenv').config();
const mongoose = require('mongoose');
const {
  MONGO_URI
} = require('../config/env');
const List = require('../models/List');
const Item = require('../models/Item');
const {
  normalizePrivateListForStorage,
  normalizePublicListForStorage
} = require('../services/privateListEncryption');
const { runInTransaction } = require('../utils/mongoTransaction');

function isPrivateListInLegacyState(list, items) {
  return Boolean(
    !list.titleEncrypted ||
    list.title !== null ||
    list.titlePlain !== null ||
    items.some(item => !item.textEncrypted || item.text !== null || item.textPlain !== null)
  );
}

function isPublicListInLegacyState(list, items) {
  return Boolean(
    list.titleEncrypted ||
    list.encryptionState !== 'plaintext' ||
    items.some(item => item.textEncrypted || item.encryptionState !== 'plaintext')
  );
}

async function migratePrivateListEncryption() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  let migratedPrivateLists = 0;
  let migratedPublicLists = 0;
  let migratedItems = 0;

  try {
    const lists = await List.find({});

    for (const list of lists) {
      const items = await Item.find({ listId: list._id });
      const changed = await runInTransaction(async session => {
        const didChange = list.isPublic
          ? isPublicListInLegacyState(list, items)
          : isPrivateListInLegacyState(list, items);
        if (!didChange) {
          return false;
        }

        if (list.isPublic) {
          await normalizePublicListForStorage(list, items);
        } else {
          await normalizePrivateListForStorage(list, items);
        }

        await list.save(session ? { session } : undefined);
        for (const item of items) {
          await item.save(session ? { session } : undefined);
        }
        return true;
      });

      if (changed) {
        if (list.isPublic) {
          migratedPublicLists += 1;
        } else {
          migratedPrivateLists += 1;
        }
        migratedItems += items.length;
      }
    }

    console.log(
      `Migrated ${migratedPrivateLists} private lists, ${migratedPublicLists} public lists, and ${migratedItems} items`
    );
  } finally {
    await mongoose.disconnect();
  }
}

migratePrivateListEncryption().catch(error => {
  console.error('Private-list encryption migration failed:', error);
  process.exitCode = 1;
});
