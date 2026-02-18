import { z } from 'zod'

// ── Goat ──

export const createGoatSchema = z.object({
  tagId: z.string().min(1, 'رقم العلامة مطلوب'),
  name: z.string().optional().nullable(),
  breedId: z.string().uuid(),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().or(z.date()),
  weight: z.number().nonnegative().optional().nullable(),
  color: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'SOLD', 'DECEASED', 'QUARANTINE']).optional(),
  motherId: z.string().uuid().optional().nullable(),
  fatherId: z.string().uuid().optional().nullable(),
  motherTagId: z.string().optional().nullable(),
  fatherTagId: z.string().optional().nullable(),
  birthId: z.string().optional().nullable(),
  penId: z.string().uuid().optional().nullable(),
  purchaseDate: z.string().or(z.date()).optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateGoatSchema = createGoatSchema.partial()

// ── Expense ──

export const createExpenseSchema = z.object({
  date: z.string().or(z.date()),
  category: z.enum(['FEED', 'MEDICINE', 'VETERINARY', 'EQUIPMENT', 'LABOR', 'UTILITIES', 'MAINTENANCE', 'OTHER']),
  description: z.string().min(1, 'الوصف مطلوب'),
  amount: z.number().positive('المبلغ يجب أن يكون موجب'),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateExpenseSchema = createExpenseSchema.partial()

// ── User ──

export const createUserSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم قصير جداً'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  fullName: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'VETERINARIAN', 'USER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
})

// ── Sale ──

export const createSaleSchema = z.object({
  goatId: z.string().uuid().optional().nullable(),
  date: z.string().or(z.date()),
  buyerName: z.string().min(1, 'اسم المشتري مطلوب'),
  buyerPhone: z.string().optional().nullable(),
  salePrice: z.number().positive('سعر البيع يجب أن يكون موجب'),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
})

// ── Calendar ──

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, 'عنوان الحدث مطلوب'),
  description: z.string().optional().nullable(),
  eventType: z.enum(['BIRTH', 'VACCINATION', 'DEWORMING', 'CHECKUP', 'BREEDING', 'WEANING', 'SALE', 'PURCHASE', 'MAINTENANCE', 'OTHER']),
  date: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
  isCompleted: z.boolean().optional(),
  goatId: z.string().optional().nullable(),
  breedingId: z.string().optional().nullable(),
  healthId: z.string().optional().nullable(),
  reminder: z.boolean().optional(),
  reminderDays: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Inventory ──

export const createInventoryItemSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1, 'الاسم بالعربية مطلوب'),
  category: z.enum(['MEDICINE', 'VACCINE', 'EQUIPMENT', 'SUPPLIES', 'CLEANING', 'OTHER']),
  unit: z.string().min(1),
  minStock: z.number().nonnegative().optional().nullable(),
  currentStock: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Pen ──

export const createPenSchema = z.object({
  name: z.string().min(1, 'اسم الحظيرة مطلوب'),
  nameAr: z.string().min(1, 'الاسم بالعربية مطلوب'),
  capacity: z.number().int().positive().optional().nullable(),
  type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Health ──

export const createHealthRecordSchema = z.object({
  goatId: z.string().uuid(),
  type: z.enum(['VACCINATION', 'DEWORMING', 'TREATMENT', 'CHECKUP', 'SURGERY']),
  date: z.string().or(z.date()),
  description: z.string().min(1, 'الوصف مطلوب'),
  veterinarian: z.string().optional().nullable(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  nextDueDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Breeding ──

export const createBreedingSchema = z.object({
  motherId: z.string().uuid(),
  fatherId: z.string().uuid(),
  matingDate: z.string().or(z.date()),
  pregnancyStatus: z.enum(['MATED', 'PREGNANT', 'DELIVERED', 'FAILED']).optional(),
  dueDate: z.string().or(z.date()).optional().nullable(),
  birthDate: z.string().or(z.date()).optional().nullable(),
  numberOfKids: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Breeds & Types ──

export const createBreedSchema = z.object({
  typeId: z.string().uuid(),
  name: z.string().min(1),
  nameAr: z.string().min(1),
  description: z.string().optional().nullable(),
  avgWeight: z.number().nonnegative().optional().nullable(),
  avgHeight: z.number().nonnegative().optional().nullable(),
  characteristics: z.string().optional().nullable(),
})

export const createGoatTypeSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  description: z.string().optional().nullable(),
})

// ── Helper: Parse and validate ──

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const messages = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
    return { success: false, error: messages }
  }
  return { success: true, data: result.data }
}

// ── Pagination ──

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
