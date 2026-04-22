const { createHttpError } = require('./http');

function getTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireTrimmedString(value, message) {
  const trimmed = getTrimmedString(value);
  if (!trimmed) {
    throw createHttpError(400, message);
  }

  return trimmed;
}

function optionalTrimmedString(value, message) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createHttpError(400, message);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw createHttpError(400, message);
  }

  return trimmed;
}

function requireBoolean(value, message) {
  if (typeof value !== 'boolean') {
    throw createHttpError(400, message);
  }

  return value;
}

module.exports = {
  getTrimmedString,
  optionalTrimmedString,
  requireBoolean,
  requireTrimmedString
};
