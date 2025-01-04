import { Kafka } from 'kafkajs';
import AWS from 'aws-sdk';
import api from '../api.js';

const client = new Kafka({
  clientId: 'logger',
  brokers: [process.env.KAFKA_HOST]
});
const admin = client.admin();
const consumer = client.consumer({ groupId: 'logger-consumer' })

await admin.connect();
await admin.createTopics({
  topics: [
    { topic: 'microservice-logs' },
    { topic: 'gateway-logs' }
  ],
});
await admin.disconnect();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function uploadLogsToS3(requestId, logs) {
  const fileContent = JSON.stringify(logs, null, 2);
  const fileName = `logs/${requestId}-${Date.now()}.json`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
    Body: fileContent,
    ContentType: 'application/json',
  };

  try {
    const result = await s3.upload(params).promise();
    console.log(`Logs uploaded to S3: ${result.Location}`);
  } catch (error) {
    console.error(`Error uploading logs to S3: ${error.message}`);
  }
}

const logsByRequestId = {};

await consumer.connect()
await consumer.subscribe({ topics: ['microservice-logs', 'gateway-logs'] })
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log(message.value.toString())

    const log = JSON.parse(message.value.toString());
    const { requestId, message: logMessage } = log;

    if (requestId) {
      if (!logsByRequestId[requestId]) {
        logsByRequestId[requestId] = [];
      }

      logsByRequestId[requestId].push(log);

      if (logMessage === 'Connection closed') {
        await uploadLogsToS3(requestId, logsByRequestId[requestId]);
        delete logsByRequestId[requestId];
      }
    }
  },
})

const PORT = process.env.PORT || 3009;

const app = api();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
