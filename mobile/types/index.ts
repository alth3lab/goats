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
  capacity?: number;
  currentCount?: number;
}

export interface Owner {
  id: string;
  name: string;
  phone?: string;
}
