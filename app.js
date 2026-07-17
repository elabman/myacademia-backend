const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const config = require('./config/config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ---- Security & core middleware ----
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl === '*' ? true : config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// Static file serving for uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), config.upload.dir)));

// ---- API docs ----
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  // Docs are optional at boot time; app still runs without them.
  // eslint-disable-next-line no-console
  console.warn('Swagger docs not loaded:', err.message);
}

// ---- Health check ----
app.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

// ---- Versioned API routes ----
app.use(config.apiPrefix, routes);

// ---- 404 + centralized error handling ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
