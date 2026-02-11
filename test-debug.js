const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugIssues() {
  console.log('\n=== DEBUGGING ISSUES ===\n');

  // Issue 1: Check why births don't appear
  console.log('1. Breeding → Birth Relationship Issue:');
  const breeding = await prisma.breeding.findFirst({
    where: { pregnancyStatus: 'DELIVERED' }
  });

  console.log(`  Breeding ID: ${breeding.id}`);
  console.log(`  Number of Kids: ${breeding.numberOfKids}`);
  
  const births = await prisma.birth.findMany({
    where: { breedingId: breeding.id }
  });

  console.log(`  Births in database: ${births.length}`);
  births.forEach((b, i) => {
    console.log(`    Birth ${i + 1}: ${b.kidTagId} - kidGoatId: ${b.kidGoatId || 'NULL'}`);
  });

  // Issue 2: Check siblings issue
  console.log('\n2. Siblings Issue (checking birthId usage):');
  const goat = await prisma.goat.findFirst({
    where: { birthId: { not: null } },
    select: { tagId: true, birthId: true }
  });

  if (goat) {
    console.log(`  Goat: ${goat.tagId}, birthId: ${goat.birthId}`);
    
    const siblingsWithSameBirthId = await prisma.goat.count({
      where: { birthId: goat.birthId }
    });
    
    console.log(`  Goats with same birthId: ${siblingsWithSameBirthId}`);
    
    // Check if this birthId exists in Birth table
    const birthRecord = await prisma.birth.findUnique({
      where: { id: goat.birthId }
    });
    
    console.log(`  Birth record exists: ${birthRecord ? 'YES' : 'NO'}`);
    if (birthRecord) {
      console.log(`  Birth breeding: ${birthRecord.breedingId}`);
    }
  }

  // Issue 3: Check all birthIds distribution
  console.log('\n3. BirthId Distribution:');
  const allBirthIds = await prisma.goat.groupBy({
    by: ['birthId'],
    _count: { birthId: true },
    where: { birthId: { not: null } }
  });
  
  console.log(`  Unique birthIds: ${allBirthIds.length}`);
  console.log(`  Top 5 by count:`);
  allBirthIds
    .sort((a, b) => b._count.birthId - a._count.birthId)
    .slice(0, 5)
    .forEach(item => {
      console.log(`    birthId=${item.birthId?.slice(0, 8)}... : ${item._count.birthId} goats`);
    });

  // Issue 4: Check seed script logic
  console.log('\n4. Checking Birth Records:');
  const totalBirths = await prisma.birth.count();
  const birthsWithGoats = await prisma.birth.count({
    where: { kidGoatId: { not: null } }
  });
  
  console.log(`  Total births: ${totalBirths}`);
  console.log(`  Births with kidGoatId: ${birthsWithGoats}`);
  console.log(`  Births without kidGoatId: ${totalBirths - birthsWithGoats}`);

  // Issue 5: Check breeding records
  console.log('\n5. Breeding Records Analysis:');
  const deliveredBreedings = await prisma.breeding.findMany({
    where: { pregnancyStatus: 'DELIVERED' },
    select: { id: true, numberOfKids: true }
  });

  console.log(`  Total delivered breedings: ${deliveredBreedings.length}`);
  
  for (const b of deliveredBreedings.slice(0, 3)) {
    const birthCount = await prisma.birth.count({
      where: { breedingId: b.id }
    });
    console.log(`    Breeding ${b.id.slice(0, 8)}: numberOfKids=${b.numberOfKids}, actual births=${birthCount}`);
  }

  await prisma.$disconnect();
}

debugIssues().catch(console.error);
