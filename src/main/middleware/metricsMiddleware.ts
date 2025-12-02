import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a Registry to register metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for HTTP requests
export const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
  registers: [register]
});

export const httpErrorCounter = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx and 5xx)',
  labelNames: ['method', 'path', 'status', 'error_type'],
  registers: [register]
});

// Database connection pool metrics
export const dbConnectionPoolGauge = new promClient.Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state'],
  registers: [register]
});


// Middleware to track HTTP request metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip metrics endpoint to avoid recursion
  if (req.path === '/metrics') {
    return next();
  }

  const startTime = Date.now();

  // Normalize path to avoid high cardinality (e.g., /users/123 -> /users/:id)
  const normalizedPath = normalizePath(req.path);

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const labels = {
      method: req.method,
      path: normalizedPath,
      status: res.statusCode.toString()
    };

    // Increment request counter
    httpRequestCounter.inc(labels);

    // Record duration
    httpRequestDuration.observe(labels, duration);

    // Track errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      httpErrorCounter.inc({
        ...labels,
        error_type: res.statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }
  });

  next();
};


// Normalize dynamic path segments to reduce metric cardinality such as /api/users/123 -> /api/users/:id
function normalizePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Limit path depth to prevent cardinality explosion
    .split('/').slice(0, 5).join('/');
}