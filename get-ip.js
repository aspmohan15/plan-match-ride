const os = require('os');
const networkInterfaces = os.networkInterfaces();
console.log('\n=== COPY THIS INTO api.js ===');
for (const interfaceName in networkInterfaces) {
  const interfaces = neworkInterfaces[interfaceName];
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`export const API_BASE_URL = 'http://${iface.address}:3000'; // (${interfaceName})`);
    }
  }
}
console.log('=============================\n');