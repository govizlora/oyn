// Live Chrome smoke checks share the same counters as the performance run.
process.env.SMOKE='1';
process.env.BASE_URL ||= 'http://127.0.0.1:5173';
await import('./webgpu-performance.mjs');
