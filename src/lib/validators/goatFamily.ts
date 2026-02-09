import { z } from 'zod'

export const parentageSchema = z.object({
  motherId: z.string().uuid().nullable().optional(),
  fatherId: z.string().uuid().nullable().optional(),
  motherTagId: z.string().nullable().optional(),
  fatherTagId: z.string().nullable().optional()
})

export type ParentageInput = z.infer<typeof parentageSchema>
