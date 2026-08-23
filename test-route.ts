import { GET } from './app/api/cad-work/jr-architect-queue/route';
import { NextRequest } from 'next/server';

async function main() {
  const req = new NextRequest('https://www.aestheticinteriorbd.com/api/cad-work/jr-architect-queue?queueType=budget');
  
  // We need to mock the auth result if possible, or just let it fail auth and see if it throws 500.
  // Actually, we can't easily run Next.js App Router handlers directly like this without context.
}
main();
