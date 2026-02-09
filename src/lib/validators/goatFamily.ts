import { z } from 'zod'

export const parentageSchema = z.object({
  motherId: z.string().uuid().nullable().optional(),
  fatherId: z.string().uuid().nullable().optional(),
  motherTagId: z.string().min(1).nullable().optional(),
  fatherTagId: z.string().min(1).nullable().optional()
}).refine((data) => data.motherId || data.motherTagId || data.fatherId || data.fatherTagId, {
  message: 'يجب تحديد الأم أو الأب',
  path: ['motherId']
})

export type ParentageInput = z.infer<typeof parentageSchema>
