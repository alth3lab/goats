const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSiblings() {
  console.log('\n=== CHECKING SIBLINGS ISSUE ===\n');

  const goat = await prisma.goat.findUnique({
    where: { tagId: 'GT-0163' }
  });

  console.log(`Goat GT-0163:`);
  console.log(`  birthId: ${goat.birthId}`);
  console.log(`  motherId: ${goat.motherId}`);
  console.log(`  fatherId: ${goat.fatherId}`);

  // Check siblings using birthId
  const siblingsByBirthId = await prisma.goat.findMany({
    where: {
      birthId: goat.birthId,
      id: { not: goat.id }
    },
    select: { tagId: true }
  });

  console.log(`\nSiblings by birthId: ${siblingsByBirthId.length}`);

  // Check siblings using birthId + motherId (correct way)
  const correctSiblings = await prisma.goat.findMany({
    where: {
      birthId: goat.birthId,
      motherId: goat.motherId,
      id: { not: goat.id }
    },
    select: { tagId: true }
  });

  console.log(`Correct siblings (birthId + motherId): ${correctSiblings.length}`);

  // Check what motherId these "siblings" have
  if (siblingsByBirthId.length > 0) {
    const firstFew = await prisma.goat.findMany({
      where: {
        birthId: goat.birthId,
        id: { not: goat.id }
      },
      select: { tagId: true, motherId: true, motherTagId: true },
      take: 5
    });

    console.log(`\nFirst 5 "siblings" motherIds:`);
    firstFew.forEach(s => {
      console.log(`  ${s.tagId}: motherId=${s.motherId === goat.motherId ? 'SAME' : 'DIFFERENT'} (${s.motherTagId})`);
    });
  }

  // Check actual birthId value
  if (!goat.birthId) {
    console.log('\nGoat has NULL birthId!');
  } else {
    const goatsWithSameBirthId = await prisma.goat.findMany({
      where: { birthId: goat.birthId },
      select: { tagId: true, motherTagId: true, fatherTagId: true }
    });
    
    console.log(`\nAll goats with birthId=${goat.birthId.slice(0, 8)}... (${goatsWithSameBirthId.length}):`);
    
    // Group by parents
    const byParents = {};
    goatsWithSameBirthId.forEach(g => {
      const key = `${g.motherTagId}-${g.fatherTagId}`;
      if (!byParents[key]) byParents[key] = [];
      byParents[key].push(g.tagId);
    });

    console.log('Grouped by parents:');
    Object.entries(byParents).forEach(([parents, tags]) => {
      console.log(`  ${parents}: ${tags.length} goats`);
    });
  }

  await prisma.$disconnect();
}

checkSiblings().catch(console.error);
