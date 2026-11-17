const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./docs/openapiSpec');

const logger = require('./utils/logger');
const requestContext = require('./middleware/requestContext');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const jwksRoutes = require('./routes/jwks.routes');
const authRoutes = require('./routes/auth.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  // requestContext must run BEFORE the body parser: if JSON parsing fails
  // the error response still needs a requestId/traceId (Contract §2).
  app.use(requestContext);
  app.use(express.json({ limit: '100kb' }));
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.requestId, traceId: req.traceId }),
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  app.use(healthRoutes);
  app.use(jwksRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/docs.json', (req, res) => res.json(openapiSpec));

  // Remaining v1 API routes are mounted here as each is built in later phases:
  // app.use('/api/v1/auth', mfaRoutes);          // Phase 4
  // app.use('/api/v1/auth', tokenSettingsRoutes); // Phase 4

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
