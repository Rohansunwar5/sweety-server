/* eslint-disable @typescript-eslint/no-explicit-any */
import os from 'os';
import cluster from 'cluster';
import app from './app';
import logger from './utils/logger';
import connectDB from './db';
import redisClient from './services/cache';

const startWorker = async () => {
  try {
    logger.info(`Worker ${process.pid} connecting to DB & Redis...`);
    await connectDB();
    await redisClient.connect();

    const port = normalizePort(process.env.PORT || '4030');

    const onError = (error: any) => {
      if (error.syscall !== 'listen') throw error;

      const bind = typeof port === 'string' ? `pipe ${port}` : `port ${port}`;
      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    };

    app.on('error', onError);

    const onListening = () => {
      const bind = typeof port === 'string' ? `pipe ${port}` : `port ${port}`;
      logger.info(`Worker ${process.pid} is listening on ${bind}`);
    };

    app.listen(port, onListening);
  } catch (err) {
    logger.error(`Worker ${process.pid} failed to start: ${(err as Error).message}`);
    process.exit(1);
  }
};

const normalizePort = (val: any) => {
  const port = parseInt(val, 10);
  if (Number.isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`);

  // ⚠️ Adjust this to 1 for your current 2 vCPU server
  // This prevents CPU overload if multiple apps are running
  const maxWorkers = process.env.CLUSTER_WORKERS
    ? parseInt(process.env.CLUSTER_WORKERS, 10)
    : 1;

  // Don’t exceed total number of CPUs
  const numCPUs = Math.min(maxWorkers, os.cpus().length);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`);
    logger.info(`Spawning a new worker...`);
    const newWorker = cluster.fork();
    logger.info(`New worker started with PID ${newWorker.process.pid}`);
  });

  // Optional: graceful restart handling
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill();
    }
    process.exit(0);
  });

} else {
  startWorker();
}
