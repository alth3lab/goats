'use client'

import { AnimalListPage, type AnimalPageConfig } from '@/app/dashboard/goats/page'

const CAMEL_CONFIG: AnimalPageConfig = {
  animalType: 'CAMEL',
  title: 'إدارة الإبل',
  titleFull: 'إدارة الإبل',
  singular: 'الناقة',
  singularAdd: 'جمل/ناقة',
  pluralActive: 'القطيع',
  reportTitle: 'تقرير قطيع الإبل',
  exportPrefix: 'camels',
  permission: 'view_goats',    // same permission for now
  addPermission: 'add_goat',   // same permission for now
}

export default function CamelsPage() {
  return <AnimalListPage config={CAMEL_CONFIG} />
}
