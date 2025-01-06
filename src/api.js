import express from 'express';
import cors from 'cors';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import cookieParser from 'cookie-parser';
import AWS from 'aws-sdk';
import { verifyAdminAuth } from './middleware/verifyAdminAuth.js';

const swaggerDocument = YAML.load('./openapi.yaml');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
  s3ForcePathStyle: true,
});

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

  app.get('/logs', verifyAdminAuth, async (_req, res) => {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'logs/',
    };
  
    try {
      const data = await s3.listObjectsV2(params).promise();
  
      const logs = data.Contents
        .filter((item) => item.Key.endsWith('.json'))
        .map((item) => ({
          requestId: item.Key.replace('logs/', '').replace('.json', ''),
          timestamp: item.LastModified,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
  
      res.json({ logs });
    } catch (error) {
      console.error(`Error fetching logs: ${error.message}`);
      res.status(500).json({ error: 'An error occurred while fetching logs' });
    }
  });

  app.get('/logs/:requestId', verifyAdminAuth, async (req, res) => {
    const { requestId } = req.params;
    const fileName = `logs/${requestId}.json`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
    };

    try {
      const data = await s3.getObject(params).promise();
      const logs = JSON.parse(data.Body.toString('utf-8'));

      res.json({ requestId, logs });
    } catch (error) {
      console.error(`Error fetching logs for ${requestId}: ${error.message}`);
      if (error.code === 'NoSuchKey') {
        res.status(404).json({ error: 'Logs not found for the specified requestId' });
      } else {
        res.status(500).json({ error: 'An error occurred while fetching logs' });
      }
    }
  });

  app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

  return app;
}
