const mongoose = require('mongoose');
const { createHttpError } = require('./http');

function isTransactionUnsupportedError(error) {
  const message = error?.message || '';
  return (
    message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('transactions are not supported')
  );
}

async function runInTransaction(work) {
  if (typeof mongoose.startSession !== 'function') {
    return work(null);
  }

  const session = await mongoose.startSession();
  try {
    if (typeof session.withTransaction === 'function') {
      let result;
      try {
        await session.withTransaction(async () => {
          result = await work(session);
        });
      } catch (error) {
        if (isTransactionUnsupportedError(error)) {
          throw createHttpError(
            503,
            'MongoDB transactions are required for this operation and are not supported by the current deployment'
          );
        }
        throw error;
      }
      return result;
    }

    return work(session);
  } finally {
    if (typeof session.endSession === 'function') {
      await session.endSession();
    }
  }
}

module.exports = { runInTransaction };
