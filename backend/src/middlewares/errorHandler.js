function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = status >= 500
    ? 'Internal server error'
    : err.message;

  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl} error:`, err);
  }

  return res.status(status).send(message);
}

module.exports = { errorHandler };
