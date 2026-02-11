const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testIntegration() {
  console.log('\n=== INTEGRATION TEST ===\n');

  // Test 1: Breeding → Birth → Goat relationship
  console.log('1. Testing Breeding → Birth → Goat Chain:');
  const breeding = await prisma.breeding.findFirst({
    where: { pregnancyStatus: 'DELIVERED' },
    include: {
      mother: { select: { tagId: true, gender: true, status: true, birthDate: true } },
      father: { select: { tagId: true, gender: true, status: true } },
      births: {
        include: {
          kidGoat: {
            select: { id: true, tagId: true, motherId: true, fatherId: true, motherTagId: true, fatherTagId: true, birthId: true, status: true }
          }
        }
      }
    }
  });

  if (breeding) {
    console.log(`  Mother: ${breeding.mother.tagId} (${breeding.mother.gender}, ${breeding.mother.status})`);
    console.log(`  Father: ${breeding.father.tagId} (${breeding.father.gender}, ${breeding.father.status})`);
    console.log(`  Mating Date: ${breeding.matingDate.toISOString().split('T')[0]}`);
    console.log(`  Status: ${breeding.pregnancyStatus}`);
    console.log(`  Number of Kids: ${breeding.numberOfKids}`);
    console.log(`  Births (${breeding.births.length}):`);
    breeding.births.forEach((birth, i) => {
      console.log(`    Kid ${i + 1}: ${birth.kidTagId} - ${birth.gender} - ${birth.status}`);
      if (birth.kidGoat) {
        console.log(`      Goat Record: Tag=${birth.kidGoat.tagId}, Status=${birth.kidGoat.status}`);
        console.log(`      Parents: Mother=${birth.kidGoat.motherTagId}, Father=${birth.kidGoat.fatherTagId}`);
        console.log(`      BirthId: ${birth.kidGoat.birthId === birth.id ? '✅ LINKED' : '❌ NOT LINKED'}`);
      }
    });
  } else {
    console.log('  ❌ No delivered breeding found');
  }

  // Test 2: Health Record with calendar integration
  console.log('\n2. Testing Health Records:');
  const healthRecord = await prisma.healthRecord.findFirst({
    where: { type: 'VACCINATION' },
    include: { goat: { select: { tagId: true } } }
  });

  if (healthRecord) {
    console.log(`  Goat: ${healthRecord.goat.tagId}`);
    console.log(`  Type: ${healthRecord.type}`);
    console.log(`  Date: ${healthRecord.date.toISOString().split('T')[0]}`);
    console.log(`  Next Due: ${healthRecord.nextDueDate ? healthRecord.nextDueDate.toISOString().split('T')[0] : 'N/A'}`);
  } else {
    console.log('  ❌ No vaccination records found');
  }

  // Test 3: Goat family relationships
  console.log('\n3. Testing Goat Family Relationships:');
  const goat = await prisma.goat.findFirst({
    where: { motherId: { not: null } },
    include: {
      mother: { select: { tagId: true, gender: true } },
      father: { select: { tagId: true, gender: true } }
    }
  });

  if (goat) {
    console.log(`  Kid: ${goat.tagId} (${goat.gender})`);
    console.log(`  Mother: ${goat.mother?.tagId} (${goat.mother?.gender})`);
    console.log(`  Father: ${goat.father?.tagId} (${goat.father?.gender})`);
    console.log(`  MotherTagId: ${goat.motherTagId}`);
    console.log(`  FatherTagId: ${goat.fatherTagId}`);

    // Find siblings
    const siblings = await prisma.goat.findMany({
      where: {
        birthId: goat.birthId,
        id: { not: goat.id }
      },
      select: { tagId: true, gender: true }
    });

    console.log(`  Siblings (${siblings.length}):`, siblings.map(s => `${s.tagId} (${s.gender})`).join(', '));
  } else {
    console.log('  ❌ No goats with parents found');
  }

  // Test 4: Feeding records connection
  console.log('\n4. Testing Feeding System:');
  const feedingRecord = await prisma.feedingRecord.findFirst({
    include: { goat: { select: { tagId: true } } }
  });

  if (feedingRecord) {
    console.log(`  Goat: ${feedingRecord.goat?.tagId || 'N/A'}`);
    console.log(`  Feed Type: ${feedingRecord.feedType}`);
    console.log(`  Quantity: ${feedingRecord.quantity} ${feedingRecord.unit}`);
    console.log(`  Date: ${feedingRecord.date.toISOString().split('T')[0]}`);
  } else {
    console.log('  ❌ No feeding records found');
  }

  // Test 5: Pen with goats and schedules
  console.log('\n5. Testing Pen Integration:');
  const pen = await prisma.pen.findFirst({
    where: { goats: { some: {} } },
    include: {
      goats: { select: { tagId: true }, take: 3 },
      feedingSchedules: { where: { isActive: true }, take: 2 }
    }
  });

  if (pen) {
    console.log(`  Pen: ${pen.nameAr} (${pen.type})`);
    console.log(`  Capacity: ${pen.currentCount}/${pen.capacity}`);
    console.log(`  Goats (showing 3): ${pen.goats.map(g => g.tagId).join(', ')}`);
    console.log(`  Active Schedules: ${pen.feedingSchedules.length}`);
  } else {
    console.log('  ❌ No pen with goats found');
  }

  // Test 6: Sale with goat status update
  console.log('\n6. Testing Sale Integration:');
  const sale = await prisma.sale.findFirst({
    include: {
      goat: { select: { tagId: true, status: true } },
      payments: true
    }
  });

  if (sale) {
    console.log(`  Goat: ${sale.goat?.tagId || 'N/A'} - Status: ${sale.goat?.status || 'N/A'}`);
    console.log(`  Buyer: ${sale.buyerName}`);
    console.log(`  Price: ${sale.salePrice}`);
    console.log(`  Payment Status: ${sale.paymentStatus}`);
    console.log(`  Payments: ${sale.payments.length}`);
  } else {
    console.log('  ❌ No sales found');
  }

  // Test 7: Calendar events
  console.log('\n7. Testing Calendar Events:');
  const eventCounts = await Promise.all([
    prisma.calendarEvent.count({ where: { eventType: 'BIRTH' } }),
    prisma.calendarEvent.count({ where: { eventType: 'VACCINATION' } }),
    prisma.calendarEvent.count({ where: { eventType: 'BREEDING' } }),
    prisma.calendarEvent.count({ where: { eventType: 'WEANING' } })
  ]);

  console.log(`  Birth Events: ${eventCounts[0]}`);
  console.log(`  Vaccination Events: ${eventCounts[1]}`);
  console.log(`  Breeding Events: ${eventCounts[2]}`);
  console.log(`  Weaning Events: ${eventCounts[3]}`);

  // Test 8: Data counts
  console.log('\n8. Overall Data Summary:');
  const counts = await Promise.all([
    prisma.goat.count(),
    prisma.goat.count({ where: { status: 'ACTIVE' } }),
    prisma.breeding.count(),
    prisma.birth.count(),
    prisma.healthRecord.count(),
    prisma.feedingRecord.count(),
    prisma.sale.count(),
    prisma.pen.count()
  ]);

  console.log(`  Total Goats: ${counts[0]} (Active: ${counts[1]})`);
  console.log(`  Breeding Records: ${counts[2]}`);
  console.log(`  Birth Records: ${counts[3]}`);
  console.log(`  Health Records: ${counts[4]}`);
  console.log(`  Feeding Records: ${counts[5]}`);
  console.log(`  Sales: ${counts[6]}`);
  console.log(`  Pens: ${counts[7]}`);

  console.log('\n=== TEST COMPLETE ===\n');

  await prisma.$disconnect();
}

testIntegration().catch(console.error);
