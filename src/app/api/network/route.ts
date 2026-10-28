import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      // IPv4 and not 127.0.0.1
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return NextResponse.json({
    success: true,
    ip: addresses[0] || 'localhost',
    allIps: addresses,
    port: 3000,
  });
}
