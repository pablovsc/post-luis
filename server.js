const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('========================================================');
console.log('   TIENDA EXPRESS POS - SERVIDOR DE PRODUCCION');
console.log('========================================================');

// Iniciar el scraper BCV en segundo plano
try {
  const bcv = spawn('node', ['scrape-bcv.js', '--daemon'], {
    detached: true,
    stdio: 'ignore',
  });
  bcv.unref();
  console.log('✓ Sincronizador de tasa BCV iniciado.');
} catch (e) {
  console.warn('! No se pudo iniciar el scraper BCV:', e.message);
}

// Iniciar Next.js en producción
const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const server = spawn(process.execPath, [nextBin, 'start', '-p', '3000'], {
  stdio: 'inherit',
  shell: false,
});

server.on('error', (err) => {
  console.error('Error al iniciar el servidor Next:', err);
});

server.on('close', (code) => {
  console.log(`El servidor se cerro con codigo ${code}`);
});

// Abrir navegador cuando el puerto 3000 responda
function checkAndOpenBrowser() {
  const req = http.get('http://localhost:3000', (res) => {
    console.log('✓ Servidor web activo en http://localhost:3000');
    console.log('✓ Abriendo navegador...');
    spawn('cmd', ['/c', 'start', 'http://localhost:3000'], { detached: true, stdio: 'ignore' }).unref();
  });

  req.on('error', () => {
    setTimeout(checkAndOpenBrowser, 1000);
  });
}

setTimeout(checkAndOpenBrowser, 1500);

