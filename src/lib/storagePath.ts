// مسار الملف داخل الـ bucket من القيمة المخزنة (مسار جديد أو رابط عام قديم)
export function storagePathOf(stored: string): string | null {
  if (!stored || stored.startsWith('data:')) return null;
  const i = stored.indexOf('/order-images/');
  if (i >= 0) return decodeURIComponent(stored.slice(i + '/order-images/'.length).split('?')[0]);
  if (/^https?:/i.test(stored)) return null;
  return stored;
}

