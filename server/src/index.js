import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and set the connection string.');
  process.exit(1);
}

async function start() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const server = app.listen(port, () => {
    console.log(`Task Tracker API listening on port ${port}`);
    if (process.env.CLIENT_ORIGIN) {
      console.log(`CLIENT_ORIGIN env: ${process.env.CLIENT_ORIGIN}`);
    }
    console.log('CORS: defaults + CLIENT_ORIGIN + editor-task*.onrender.com / editflows-manager*.onrender.com');
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
