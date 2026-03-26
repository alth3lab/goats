// ─── Goat Types ──────────────────────────────────────────
export type GoatGender = 'MALE' | 'FEMALE';
export type GoatStatus = 'ACTIVE' | 'SOLD' | 'DECEASED' | 'QUARANTINE';

export interface GoatAge {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  category: string;
  formatted: string;
}

export interface Goat {
  id: string;
  tagId: string;
  name?: string;
  gender: GoatGender;
  birthDate: string;
  weight?: number;
  status: GoatStatus;
  tagColor?: string;
  motherTagId?: string;
  fatherTagId?: string;
  ownerId?: string;
  penId?: string;
  breed?: { id: string; nameAr: string; type?: { id: string; nameAr: string } };
  owner?: { id: string; name: string; phone?: string };
  pen?: { nameAr: string };
  pregnancyStatus?: 'PREGNANT' | 'CONFIRMED';
  dueDate?: string;
  age?: GoatAge;
  thumbnail?: string;
  imageUrl?: string;
}

// ─── Health Types ────────────────────────────────────────
export type HealthType = 'VACCINATION' | 'DEWORMING' | 'TREATMENT' | 'CHECKUP' | 'SURGERY';

export interface HealthRecord {
  id: string;
  goatId: string;
  type: HealthType;
  date: string;
  description?: string;
  veterinarian?: string;
  cost?: number;
  nextDueDate?: string;
  goat?: { tagId: string; name?: string };
}

// ─── Sales Types ─────────────────────────────────────────
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface Sale {
  id: string;
  goatId: string;
  ownerId?: string;
  date: string;
  salePrice: number;
  buyerName: string;
  buyerPhone?: string;
  paymentStatus: PaymentStatus;
  notes?: string;
  totalPaid: number;
  remaining: number;
  goat?: { tagId: string; name?: string };
  payments?: Payment[];
}

export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  date: string;
  method?: string;
}

// ─── Feed Types ──────────────────────────────────────────
export interface Feed {
  id: string;
  nameAr: string;
  nameEn?: string;
  category: string;
  protein?: number;
  energy?: number;
  unitPrice?: number;
  reorderLevel?: number;
  supplier?: string;
  description?: string;
  currentStock?: number;
}

// ─── Auth Types ──────────────────────────────────────────
export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: string;
  tenantId?: string;
  farmId?: string;
}

export interface FarmInfo {
  id: string;
  name: string;
  nameAr: string;
  currency: string;
  farmType: string;
}

export interface UserFarm {
  id: string;
  name: string;
  nameAr: string;
  farmType: string;
  role: string;
  tenantName: string;
  tenantId: string;
}

export interface AuthState {
  user: AuthUser | null;
  farm: FarmInfo | null;
  farms: UserFarm[];
  permissions: string[];
  loading: boolean;
  token: string | null;
}

// ─── Stats Types ─────────────────────────────────────────
export interface DashboardStats {
  totalGoats: number;
  activeGoats: number;
  maleGoats: number;
  femaleGoats: number;
  pregnantGoats: number;
  totalTypes: number;
  totalBreeds: number;
  activeBreedings: number;
  lowStockCount: number;
  totalExpenses: number;
  totalSales: number;
  netProfit: number;
  currentYear: number;
  monthly: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    salesCount: number;
    birthsCount: number;
    deathsCount: number;
    herdGrowth: number;
    mortalityRate: number;
    expensesByCategory: { category: string; amount: number }[];
  };
  comparison?: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    salesCount: number;
    birthsCount: number;
    deathsCount: number;
    herdGrowth: number;
  };
  feedConsumption?: {
    quantity: number;
    cost: number;
    hasLogs: boolean;
    source: string;
  };
}

// ─── Alert Types ─────────────────────────────────────────
export type AlertType = 'BIRTH' | 'HEALTH' | 'WEANING' | 'PEN_CAPACITY' | 'DEATHS' | 'BREEDING_OVERDUE';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  severity: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

// ─── Common Types ────────────────────────────────────────
export interface Breed {
  id: string;
  nameAr: string;
  nameEn?: string;
  type?: { id: string; nameAr: string };
}

export interface AnimalType {
  id: string;
  nameAr: string;
  nameEn?: string;
}

export interface Pen {
  id: string;
  nameAr: string;
  type?: string;
  capacity?: number;
  currentCount?: number;
}

export interface Owner {
  id: string;
  name: string;
  phone?: string;
  idNumber?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
  activeGoats?: number;
  totalExpenses?: number;
  totalSales?: number;
}

// ─── Breeding Types ──────────────────────────────────────
export type PregnancyStatus = 'MATED' | 'PREGNANT' | 'DELIVERED' | 'FAILED';

export interface Breeding {
  id: string;
  motherId: string;
  fatherId?: string;
  matingDate: string;
  pregnancyStatus: PregnancyStatus;
  dueDate?: string;
  birthDate?: string;
  numberOfKids?: number;
  notes?: string;
  mother?: { tagId: string; name?: string };
  father?: { tagId: string; name?: string };
  births?: Array<{ id: string; kidId?: string; birthDate: string }>;
}

// ─── Expense Types ───────────────────────────────────────
export type ExpenseCategory = 'FEED' | 'MEDICINE' | 'VETERINARY' | 'EQUIPMENT' | 'LABOR' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  ownerId?: string;
  owner?: { id: string; name: string };
}

// ─── Calendar Types ──────────────────────────────────────
export type EventType = 'BIRTH' | 'VACCINATION' | 'DEWORMING' | 'CHECKUP' | 'BREEDING' | 'WEANING' | 'SALE' | 'PURCHASE' | 'MAINTENANCE' | 'OTHER';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: EventType;
  date: string;
  endDate?: string;
  isCompleted: boolean;
  goatId?: string;
  breedingId?: string;
  reminder?: boolean;
  reminderDays?: number;
}

// ─── Inventory Types ─────────────────────────────────────
export interface InventoryItem {
  id: string;
  name: string;
  nameAr?: string;
  category: string;
  currentStock: number;
  unit?: string;
  minStock?: number;
  unitPrice?: number;
  supplier?: string;
  notes?: string;
  transactions?: Array<{ id: string; type: string; quantity: number; date: string; notes?: string }>;
}

// ─── Activity Types ──────────────────────────────────────
export interface Activity {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  createdAt: string;
  user?: { fullName: string; username: string };
}

// ─── Settings Types ──────────────────────────────────────
export interface FarmSettings {
  farmName: string;
  farmNameAr: string;
  phone?: string;
  address?: string;
  currency: string;
  notifications?: boolean;
  alertPenCapacityPercent?: number;
  alertDeathCount?: number;
  alertDeathWindowDays?: number;
  alertBreedingOverdueDays?: number;
}
