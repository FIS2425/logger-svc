import { KafkaClient, Consumer } from 'kafka-node';
import api from '../api.js';

const client = new KafkaClient({ kafkaHost: process.env.KAFKA_HOST });
const consumer = new Consumer(client, [{ topic: 'microservice-logs', partition: 0 }], { autoCommit: true });
const PORT = process.env.PORT || 3001;

consumer.on('message', (message) => {
  console.log('Log received:', message.value);
  // Here, you can save the logs to a database or forward them to a monitoring tool
});

consumer.on('error', (err) => console.error('Error consuming logs', err));

const app = api();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
