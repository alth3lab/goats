// حساب عمر الحيوان وتحديد الفئة العمرية (ماعز / أغنام / إبل)

export type AnimalSpecies = 'GOAT' | 'SHEEP' | 'CAMEL' | 'MIXED';

export interface GoatAge {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  category: string;
  categoryAr: string;
}

// ── فئات أعمار الماعز والأغنام ──
function getGoatCategory(totalMonths: number): { category: string; categoryAr: string } {
  if (totalMonths < 1) return { category: 'Newborn', categoryAr: 'مولود' };
  if (totalMonths < 3) return { category: 'Nursing', categoryAr: 'رضيع' };
  if (totalMonths < 6) return { category: 'Weaned', categoryAr: 'فطيم' };
  if (totalMonths < 12) return { category: 'Kid', categoryAr: 'جذع' };
  if (totalMonths < 18) return { category: 'Yearling', categoryAr: 'ثني' };
  if (totalMonths < 30) return { category: 'Young Adult', categoryAr: 'رباع' };
  if (totalMonths < 48) return { category: 'Adult', categoryAr: 'سديس' };
  return { category: 'Mature', categoryAr: 'بازل' };
}

// ── فئات أعمار الإبل (تختلف تماماً عن الماعز) ──
// الإبل تنضج أبطأ بكثير من الماعز
function getCamelCategory(totalMonths: number): { category: string; categoryAr: string } {
  if (totalMonths < 1) return { category: 'Newborn', categoryAr: 'مولود' };
  if (totalMonths < 6) return { category: 'Nursing', categoryAr: 'رضيع' };
  if (totalMonths < 12) return { category: 'Weaned Calf', categoryAr: 'حوار' };        // حتى سنة
  if (totalMonths < 24) return { category: 'Yearling', categoryAr: 'مفرود' };           // 1-2 سنة
  if (totalMonths < 36) return { category: 'Young Camel', categoryAr: 'حق' };           // 2-3 سنوات
  if (totalMonths < 48) return { category: 'Sub-Adult', categoryAr: 'لقي' };            // 3-4 سنوات
  if (totalMonths < 60) return { category: 'Juvenile', categoryAr: 'جذع' };             // 4-5 سنوات
  if (totalMonths < 72) return { category: 'Young Adult', categoryAr: 'ثني' };          // 5-6 سنوات
  if (totalMonths < 84) return { category: 'Adult', categoryAr: 'رباع' };               // 6-7 سنوات
  if (totalMonths < 96) return { category: 'Full Adult', categoryAr: 'سديس' };          // 7-8 سنوات
  return { category: 'Mature', categoryAr: 'بازل' };                                    // 8+ سنوات
}

export function calculateGoatAge(birthDate: Date | string, species?: AnimalSpecies): GoatAge {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const now = new Date();
  
  // حساب الفرق
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  
  // تعديل الحسابات إذا كانت سالبة
  if (days < 0) {
    months--;
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  
  // تحديد الفئة العمرية حسب نوع الحيوان
  const { category, categoryAr } = species === 'CAMEL'
    ? getCamelCategory(totalMonths)
    : getGoatCategory(totalMonths);
  
  return {
    years,
    months,
    days,
    totalMonths,
    category,
    categoryAr
  };
}

export function formatAge(age: GoatAge): string {
  const parts = [];
  if (age.years > 0) parts.push(`${age.years} سنة`);
  if (age.months > 0) parts.push(`${age.months} شهر`);
  if (age.days > 0 && age.years === 0) parts.push(`${age.days} يوم`);
  
  return parts.join(' و ') || 'أقل من يوم';
}

export function getAgeCategory(birthDate: Date | string, species?: AnimalSpecies): string {
  const age = calculateGoatAge(birthDate, species);
  return age.categoryAr;
}

// ── قائمة فئات الأعمار حسب نوع الحيوان (للفلترة) ──
export function getAgeCategoryList(species?: AnimalSpecies): string[] {
  if (species === 'CAMEL') {
    return ['مولود', 'رضيع', 'حوار', 'مفرود', 'حق', 'لقي', 'جذع', 'ثني', 'رباع', 'سديس', 'بازل'];
  }
  return ['مولود', 'رضيع', 'فطيم', 'جذع', 'ثني', 'رباع', 'سديس', 'بازل'];
}
