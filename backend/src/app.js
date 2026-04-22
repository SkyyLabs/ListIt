const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorHandler');
const { API_HEALTHCHECK_MESSAGE } = require('./config/constants');
const { CORS_ORIGIN } = require('./config/env');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());

  app.use('/categories', require('./routes/categories'));
  app.use('/lists', require('./routes/lists'));
  app.use('/items', require('./routes/items'));
  app.use('/preferences', require('./routes/preferences'));

  app.get('/', (_, res) => res.send(API_HEALTHCHECK_MESSAGE));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
