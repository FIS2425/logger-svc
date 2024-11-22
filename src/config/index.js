import { KafkaClient, Consumer } from 'kafka-node';
import api from '../api.js';

const client = new KafkaClient({ kafkaHost: process.env.KAFKA_HOST });

client.createTopics(['microservice-logs', 'gateway-logs'], (err, _) => {
  if (err) {
    console.error('Error creating topic:', err);
  }
  console.log(_);
  const microserviceConsumer = new Consumer(client, [{ topic: 'microservice-logs', partition: 0 }], { autoCommit: true });
  const gatewayConsumer = new Consumer(client, [{ topic: 'gateway-logs', partition: 0 }], { autoCommit: true });

  microserviceConsumer.on('message', (message) => {
    console.log('Log received:', message.value);
    // Here, you can save the logs to a database or forward them to a monitoring tool
  });

  microserviceConsumer.on('error', (err) => console.error('Error consuming logs', err));

  gatewayConsumer.on('message', (message) => {
    console.log('Log received:', message.value);
    // Here, you can save the logs to a database or forward them to a monitoring tool
  });

  gatewayConsumer.on('error', (err) => console.error('Error consuming logs', err));

  const PORT = process.env.PORT || 3009;

  const app = api();

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
});
