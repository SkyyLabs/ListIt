const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorHandler');
const { API_HEALTHCHECK_MESSAGE } = require('./config/constants');
const { CORS_ORIGINS } = require('./config/env');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    })
  );
  app.use(express.json());

  app.use('/categories', require('./routes/categories'));
  app.use('/lists', require('./routes/lists'));
  app.use('/items', require('./routes/items'));
  app.use('/preferences', require('./routes/preferences'));
  app.use('/invitations', require('./routes/invitations'));

  app.get('/', (_, res) => res.send(API_HEALTHCHECK_MESSAGE));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
