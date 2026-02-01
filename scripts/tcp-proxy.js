// Simple TCP proxy to forward LAN traffic to Docker containers
// Run: node tcp-proxy.js

const net = require('net');

const PORTS = [
  { listen: 14003, target: 4003, name: 'Realtime WebSocket' },  // Use 14003 externally -> 4003 Docker
  { listen: 18082, target: 8082, name: 'User Service' },        // Use 18082 externally -> 8082 Spring
];

const LISTEN_HOST = '0.0.0.0';
const TARGET_HOST = '127.0.0.1';

PORTS.forEach(({ listen, target, name }) => {
  const server = net.createServer((clientSocket) => {
    console.log(`[${name}] New connection from ${clientSocket.remoteAddress}`);

    const targetSocket = net.createConnection({ port: target, host: TARGET_HOST }, () => {
      console.log(`[${name}] Connected to localhost:${target}`);
    });

    // Forward data in both directions
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    // Handle errors
    clientSocket.on('error', (err) => {
      console.log(`[${name}] Client error:`, err.message);
      targetSocket.destroy();
    });

    targetSocket.on('error', (err) => {
      console.log(`[${name}] Target error:`, err.message);
      clientSocket.destroy();
    });

    // Handle close
    clientSocket.on('close', () => {
      targetSocket.destroy();
    });

    targetSocket.on('close', () => {
      clientSocket.destroy();
    });
  });

  server.listen(listen, LISTEN_HOST, () => {
    console.log(`[${name}] Forwarding ${LISTEN_HOST}:${listen} -> ${TARGET_HOST}:${target}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[${name}] Port ${listen} already in use. Skipping...`);
    } else {
      console.error(`[${name}] Server error:`, err.message);
    }
  });
});

console.log('\nTCP Proxy running. Press Ctrl+C to stop.\n');
