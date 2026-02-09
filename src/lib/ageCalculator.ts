// حساب عمر الماعز وتحديد الفئة العمرية

export interface GoatAge {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  category: string;
  categoryAr: string;
}

export function calculateGoatAge(birthDate: Date | string): GoatAge {
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
  
  // تحديد الفئة العمرية
  let category = '';
  let categoryAr = '';
  
  if (totalMonths < 1) {
    category = 'Newborn';
    categoryAr = 'مولود';
  } else if (totalMonths < 3) {
    category = 'Nursing';
    categoryAr = 'رضيع';
  } else if (totalMonths < 6) {
    category = 'Weaned';
    categoryAr = 'فطيم';
  } else if (totalMonths < 12) {
    category = 'Kid';
    categoryAr = 'جذع';
  } else if (totalMonths < 18) {
    category = 'Yearling';
    categoryAr = 'ثني';
  } else if (totalMonths < 30) {
    category = 'Young Adult';
    categoryAr = 'رباع';
  } else if (totalMonths < 48) {
    category = 'Adult';
    categoryAr = 'سديس';
  } else {
    category = 'Mature';
    categoryAr = 'بازل';
  }
  
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

export function getAgeCategory(birthDate: Date | string): string {
  const age = calculateGoatAge(birthDate);
  return age.categoryAr;
}
