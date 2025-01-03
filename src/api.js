import express from 'express';
import cors from 'cors';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import cookieParser from 'cookie-parser';

const swaggerDocument = YAML.load('./openapi.yaml');

export default function () {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/', (_req, res) => {
    res.send('API funcionando correctamente');
  });

  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });

  app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

  return app;
}
