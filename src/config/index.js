import { Kafka } from 'kafkajs';
import api from '../api.js';
import { uploadLogsToS3 } from '../utils/uploadLogs.js';

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

const logsByRequestId = {};
const pendingTimers = {};

await consumer.connect()
await consumer.subscribe({ topics: ['microservice-logs', 'gateway-logs'] })
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log(message.value.toString())

    const log = JSON.parse(message.value.toString());

    if ((log.params && log.params.request_id) || log.requestId) {
      const requestId = log.params ? log.params.request_id : log.requestId;

      if (!logsByRequestId[requestId]) {
        logsByRequestId[requestId] = [];
      }

      logsByRequestId[requestId].push(log);

      // If there is a pending timer for this request, clear it
      if (pendingTimers[requestId]) {
        clearTimeout(pendingTimers[requestId]);
      }

      // Configurate a timer to upload logs to S3 in 5 seconds
      pendingTimers[requestId] = setTimeout(async () => {
        await uploadLogsToS3(requestId, logsByRequestId[requestId]);
        delete logsByRequestId[requestId];
        delete pendingTimers[requestId];
      }, 5000);
    }
  },
})

const PORT = process.env.PORT || 3009;

const app = api();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
