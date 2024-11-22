import { Kafka } from 'kafkajs';
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

await consumer.connect()
await consumer.subscribe({ topics: ['microservice-logs', 'gateway-logs'] })
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log(message.value.toString())
  },
})

const PORT = process.env.PORT || 3009;

const app = api();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
