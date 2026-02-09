import { z } from 'zod'

export const kidSchema = z.object({
  tagId: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  weight: z.number().nonnegative().optional(),
  status: z.enum(['ALIVE', 'STILLBORN', 'DIED']),
  notes: z.string().optional().nullable()
})

export const recordBirthSchema = z.object({
  birthDate: z.string().min(1),
  kids: z.array(kidSchema).min(1)
})
