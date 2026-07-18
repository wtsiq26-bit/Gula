const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const q = 'Amo';
    const searchPattern = `%${q}%`;
    const res = await prisma.$queryRaw`
      SELECT id, genericName, tradeName, category, barcode 
      FROM Medicine 
      WHERE LOWER(genericName) LIKE LOWER(${searchPattern})
      LIMIT 10
    `;
    console.log(res);
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
