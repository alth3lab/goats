import mariadb from 'mariadb';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

console.log('Testing connection...');

const pool = mariadb.createPool({
  host: 'easypanel.suhail.cc',
  port: 3308,
  user: 'mysql',
  password: '94144096f578f6af56c5',
  database: 'goats_db',
  connectionLimit: 5,
  acquireTimeout: 30000,
  connectTimeout: 10000,
  idleTimeout: 60000,
});

console.log('Pool created');

try {
  const conn = await pool.getConnection();
  console.log('Connection acquired');
  
  const rows = await conn.query('SELECT 1 as val');
  console.log('Query result:', rows);
  
  conn.release();
  console.log('Connection released');
  
  // Test with Prisma
  console.log('Testing with Prisma...');
  const adapter = new PrismaMariaDb(pool);
  const prisma = new PrismaClient({ adapter });
  
  const types = await prisma.goatType.findMany();
  console.log('Prisma types:', types);
  
  await prisma.$disconnect();
  await pool.end();
  console.log('All tests passed!');
  
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
