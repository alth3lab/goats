/**
 * Migration: Copy existing FeedType + InventoryItem data into unified StockItem / StockMovement tables.
 *
 * Run:  npx ts-node --project tsconfig.json prisma/migrate-to-stock.ts
 *       (or: npm run ts-node prisma/migrate-to-stock.ts)
 *
 * Safe to run multiple times — uses upsert / idempotent checks.
 * Does NOT delete or modify the old tables.
 */

import { PrismaClient, StockType, MovementType, FeedCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Migrating to StockItem / StockMovement ===\n')

  // ---- 1. FeedType → StockItem (type = FEED) ----
  const feedTypes = await prisma.feedType.findMany({
    include: { stock: true, consumptions: true }
  })

  console.log(`Found ${feedTypes.length} feed types to migrate…`)
  for (const ft of feedTypes) {
    // Calculate current stock from FeedStock entries
    const totalStock = ft.stock.reduce((sum, s) => sum + s.quantity, 0)

    await prisma.stockItem.upsert({
      where: { id: `feed-${ft.id}` },
      update: {},    // don't overwrite if already migrated
      create: {
        id: `feed-${ft.id}`,
        tenantId: ft.tenantId,
        farmId: ft.farmId,
        nameAr: ft.nameAr,
        name: ft.nameAr,
        type: StockType.FEED,
        feedCategory: ft.category as FeedCategory,
        unit: 'كجم',
        currentStock: totalStock,
        minStock: null,
        unitPrice: ft.unitPrice ?? null,
        supplier: ft.supplier ?? null,
        proteinPct: ft.protein ?? null,
        energyKcal: ft.energy ?? null,
        reorderLevel: ft.reorderLevel ?? 50,
        notes: ft.notes ?? null,
        isActive: true,
      }
    })

    // Migrate FeedStock rows → StockMovement (PURCHASE)
    for (const fs of ft.stock) {
      await prisma.stockMovement.upsert({
        where: { id: `fstock-${fs.id}` },
        update: {},
        create: {
          id: `fstock-${fs.id}`,
          tenantId: fs.tenantId,
          farmId: fs.farmId,
          itemId: `feed-${ft.id}`,
          type: MovementType.PURCHASE,
          qty: fs.quantity,
          unitCost: fs.cost ?? null,
          date: fs.purchaseDate,
          expiryDate: fs.expiryDate ?? null,
          reference: `FeedStock:${fs.id}`,
          notes: fs.notes ?? null,
        }
      })
    }

    // Migrate DailyFeedConsumption rows → StockMovement (FEED_USAGE, negative qty)
    for (const dc of ft.consumptions) {
      await prisma.stockMovement.upsert({
        where: { id: `fdcons-${dc.id}` },
        update: {},
        create: {
          id: `fdcons-${dc.id}`,
          tenantId: dc.tenantId,
          farmId: dc.farmId,
          itemId: `feed-${ft.id}`,
          type: MovementType.FEED_USAGE,
          qty: -Math.abs(dc.quantity),   // always negative = outbound
          unitCost: null,
          date: dc.date,
          penId: dc.penId ?? null,
          reference: `DailyFeedConsumption:${dc.id}`,
          notes: dc.notes ?? null,
        }
      })
    }
  }

  console.log('  ✅ FeedType → StockItem done')

  // ---- 2. InventoryItem → StockItem ----
  const invItems = await prisma.inventoryItem.findMany({
    include: { transactions: true }
  })

  const categoryToType: Record<string, StockType> = {
    MEDICINE:  StockType.MEDICINE,
    VACCINE:   StockType.VACCINE,
    EQUIPMENT: StockType.EQUIPMENT,
    SUPPLIES:  StockType.SUPPLY,
    CLEANING:  StockType.SUPPLY,
    OTHER:     StockType.SUPPLY,
  }

  console.log(`Found ${invItems.length} inventory items to migrate…`)
  for (const inv of invItems) {
    await prisma.stockItem.upsert({
      where: { id: `inv-${inv.id}` },
      update: {},
      create: {
        id: `inv-${inv.id}`,
        tenantId: inv.tenantId,
        farmId: inv.farmId,
        nameAr: inv.nameAr,
        name: inv.name ?? inv.nameAr,
        type: categoryToType[inv.category] ?? StockType.SUPPLY,
        unit: inv.unit ?? 'وحدة',
        currentStock: inv.currentStock,
        minStock: inv.minStock ?? null,
        unitPrice: inv.unitPrice ?? null,
        supplier: inv.supplier ?? null,
        notes: inv.notes ?? null,
        isActive: true,
      }
    })

    // Migrate InventoryTransaction → StockMovement
    for (const tx of inv.transactions) {
      const isOut = ['USAGE', 'EXPIRED'].includes(tx.type)
      await prisma.stockMovement.upsert({
        where: { id: `invtx-${tx.id}` },
        update: {},
        create: {
          id: `invtx-${tx.id}`,
          tenantId: tx.tenantId,
          farmId: inv.farmId,
          itemId: `inv-${inv.id}`,
          type: tx.type as MovementType,
          qty: isOut ? -Math.abs(tx.quantity) : Math.abs(tx.quantity),
          unitCost: tx.unitPrice ?? null,
          date: tx.date,
          reference: tx.reference ?? `InventoryTransaction:${tx.id}`,
          notes: tx.notes ?? null,
          createdBy: tx.createdBy ?? null,
        }
      })
    }
  }

  console.log('  ✅ InventoryItem → StockItem done')

  const totalItems = await prisma.stockItem.count()
  const totalMovements = await prisma.stockMovement.count()
  console.log(`\n=== Migration complete: ${totalItems} items, ${totalMovements} movements ===`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
