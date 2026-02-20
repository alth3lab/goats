/**
 * Dynamic animal labels based on farm type.
 * Used across all dashboard pages to show the correct animal name.
 */

export interface AnimalLabels {
  /** e.g. "الأغنام" */
  plural: string
  /** e.g. "أغنام" — without ال */
  singular: string
  /** e.g. "إدارة الأغنام" */
  management: string
  /** e.g. "متابعة وإدارة قطيع الأغنام" */
  subtitle: string
  /** e.g. "🐑" */
  icon: string
}

const labels: Record<string, AnimalLabels> = {
  SHEEP: {
    plural: 'الأغنام',
    singular: 'أغنام',
    management: 'إدارة الأغنام',
    subtitle: 'متابعة وإدارة قطيع الأغنام',
    icon: '🐑',
  },
  CAMEL: {
    plural: 'الإبل',
    singular: 'إبل',
    management: 'إدارة الإبل',
    subtitle: 'متابعة وإدارة قطيع الإبل',
    icon: '🐪',
  },
  MIXED: {
    plural: 'الحيوانات',
    singular: 'حيوانات',
    management: 'إدارة الحيوانات',
    subtitle: 'متابعة وإدارة الحيوانات',
    icon: '🐾',
  },
}

const DEFAULT = labels.SHEEP

export function getAnimalLabels(farmType?: string | null): AnimalLabels {
  return labels[farmType || 'SHEEP'] || DEFAULT
}
