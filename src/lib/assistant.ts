// منطق فهم أوامر المساعد (بدون اعتماد على أي خدمة خارجية) - دوال نقية قابلة للاختبار

export type Status = 'pending' | 'in_progress' | 'ready' | 'delivered';

export const STATUS_LABELS: Record<Status, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  ready: 'جاهز',
  delivered: 'تم التسليم',
};

export interface OrderLike {
  id: string;
  order_code: string;
  customer_name: string;
  phone?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
  price?: number | string | null;
  status: string;
  order_images?: unknown[] | null;
}

export type Intent =
  | { type: 'greeting' }
  | { type: 'help' }
  | { type: 'stats' }
  | { type: 'list'; status?: Status; date?: string; dateLabel?: string; name?: string }
  | { type: 'find'; code?: string; name?: string }
  | { type: 'total'; name?: string; status?: Status }
  | { type: 'images'; code?: string; name?: string }
  | { type: 'time' }
  | { type: 'date' }
  | { type: 'add'; name?: string; phone?: string; price?: number; date?: string; time?: string; notes?: string }
  | { type: 'status'; code?: string; name?: string; status?: Status }
  | { type: 'delete'; code?: string; name?: string }
  | { type: 'confirm' }
  | { type: 'cancel' }
  | { type: 'unknown' };

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** توحيد النص: أرقام عربية->إنجليزية، إزالة التشكيل، توحيد الهمزات والياء والتاء المربوطة */
export function normalize(text: string): string {
  let s = text || '';
  s = s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  s = s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  s = s.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  s = s.replace(/[؟?!،,؛]/g, ' ');
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

const WEEKDAYS: Record<string, number> = {
  الاحد: 0, الاثنين: 1, الاتنين: 1, الثلاثاء: 2, التلات: 2, الاربعاء: 3, الاربع: 3, الخميس: 4, الجمعه: 5, السبت: 6,
};

const W = (re: string) => new RegExp(`(?:^|\\s)(?:${re})(?=\\s|$)`);

/** استخراج تاريخ من النص الموحد. يرجع null لو لا يوجد */
export function parseDate(n: string, today: Date): { date: string; label: string } | null {
  if (W('بعد بكره|بعد غد|بعد بكرا').test(n)) return { date: localDateStr(addDays(today, 2)), label: 'بعد غد' };
  if (W('بكره|بكرا|غدا|غد').test(n)) return { date: localDateStr(addDays(today, 1)), label: 'غدا' };
  if (W('النهارده|اليوم|انهارده').test(n)) return { date: localDateStr(today), label: 'اليوم' };
  const iso = n.match(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
  if (iso) {
    const d = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    return { date: d, label: d };
  }
  const dm = n.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?!\d)/);
  if (dm) {
    const day = Number(dm[1]);
    const mon = Number(dm[2]);
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
      let year = dm[3] ? Number(dm[3]) : today.getFullYear();
      if (year < 100) year += 2000;
      let date = new Date(year, mon - 1, day);
      if (!dm[3] && date < addDays(today, -1)) date = new Date(year + 1, mon - 1, day);
      return { date: localDateStr(date), label: localDateStr(date) };
    }
  }
  for (const [name, idx] of Object.entries(WEEKDAYS)) {
    if (W(`(?:يوم )?${name}`).test(n)) {
      const diff = (idx - today.getDay() + 7) % 7 || 7;
      const d = localDateStr(addDays(today, diff));
      return { date: d, label: `يوم ${name} ${d}` };
    }
  }
  return null;
}

export function parseTime(n: string): string | null {
  const m = n.match(/(?:الساعه|ساعه)\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|الصبح|مساء|بالليل|عصرا|العصر|ظهرا|الظهر)?/);
  const m2 = n.match(/(?<!\d)(\d{1,2}):(\d{2})(?!\d)/);
  let h: number;
  let min = 0;
  let suffix = '';
  if (m) {
    h = Number(m[1]);
    min = m[2] ? Number(m[2]) : 0;
    suffix = m[3] || '';
  } else if (m2) {
    h = Number(m2[1]);
    min = Number(m2[2]);
  } else return null;
  if (h > 23 || min > 59) return null;
  if (/مساء|بالليل|عصرا|العصر/.test(suffix) && h < 12) h += 12;
  if (/ظهرا|الظهر/.test(suffix) && h < 11) h += 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function parseStatus(n: string): Status | undefined {
  if (W('(?:قيد )?(?:ال)?(?:انتظار|معلق)|معلقه').test(n)) return 'pending';
  if (W('(?:قيد )?(?:ال)?(?:تنفيذ|شغل)|جاري').test(n)) return 'in_progress';
  if (W('(?:ال)?(?:جاهز|جاهزه|جاهزين)|خلص|خلصت|خلصان').test(n)) return 'ready';
  if (W('(?:تم )?(?:ال)?تسليم|اتسلم|اتسلمت|استلم|استلمه|المسلمه').test(n)) return 'delivered';
  return undefined;
}

const NAME_STOP = new RegExp(
  '\\s+(?:و?رقم|و?تليفون|و?موبايل|و?هاتف|و?سعر|و?بسعر|و?مبلغ|و?تسليم|و?هيتسلم|و?يتسلم|و?ميعاد|و?بتاريخ|و?تاريخ|و?يوم|و?الساعه|و?ساعه|و?ملاحظه|و?ملاحظات|و?بكره|و?بكرا|و?غدا|و?بعد|و?حاله|و?الحاله|الي|اللي|الى|الي|او|اي|تم|قيد|جاهز|جاهزه|خلص|خلصت)(?:\\s|$).*$'
);

function cleanName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let s = raw.replace(NAME_STOP, '').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(?:ال)?(?:عميل|عميله|زبون|اوردر|طلب)\s+/, '').trim();
  return s || undefined;
}

const NOT_NAMES = /^(?:(?:اللي|الي|هتتسلم|هيتسلم|هتسلم|يتسلم)(?:\s.*)?|جديد|جديده|كلها|كله|اليوم|بكره|بكرا|غدا|الكل|لسه|متاخر|متاخره|جاهز|جاهزه|الجاهزه|الجديده|الي|اللي|عندي|عندنا|عندك|كام|كم|كلهم|دلوقتي|حاليا)$/;

/** استخراج اسم العميل بعد: باسم / للعميل / عميل / طلب */
export function extractName(n: string): string | undefined {
  const patterns = [
    /(?:باسم|بأسم|اسمه|اسمها|اسم)\s+(.+)/,
    /(?:للعميل|للعميله|لعميل|لعميله|للزبون)\s+(.+)/,
    /(?:طلب|اوردر|طلبات|اوردرات)\s+(?:العميل|العميله|الزبون)\s+(.+)/,
    /(?:عميل|عميله)\s+(.+)/,
    /(?:طلبات|اوردرات|طلب|اوردر)\s+(.+)/,
  ];
  for (const p of patterns) {
    const m = n.match(p);
    if (m) {
      const name = cleanName(m[1]);
      if (name && !NOT_NAMES.test(name) && !parseDate(name, new Date()) && !parseStatus(name)) return name;
    }
  }
  return undefined;
}

/** يرجع الاسم بكتابته الأصلية (قبل توحيد الهمزات والياء) من النص الخام */
export function restoreName(text: string, nameNorm?: string): string | undefined {
  if (!nameNorm) return nameNorm;
  const orig = text.split(/\s+/).filter(Boolean);
  const norm = orig.map((t) => normalize(t));
  const target = nameNorm.split(' ');
  for (let i = 0; i + target.length <= norm.length; i++) {
    if (target.every((t, j) => norm[i + j] === t)) {
      return orig.slice(i, i + target.length).join(' ').replace(/^[\s،,؟?!]+|[\s،,؟?!]+$/g, '');
    }
  }
  return nameNorm;
}

export function extractCode(n: string): string | undefined {
  const m = n.match(/(?<!\d)(\d{7})(?!\d)/);
  return m ? m[1] : undefined;
}

export function extractPhone(n: string): string | undefined {
  const m = n.match(/(?<!\d)(01[0125]\d{8})(?!\d)/) || n.match(/(?<!\d)(\+?\d{10,13})(?!\d)/);
  return m ? m[1] : undefined;
}

export function extractPrice(n: string): number | undefined {
  const m =
    n.match(/(?:سعر|بسعر|مبلغ|بمبلغ|بقيمه)\s*(\d+(?:\.\d+)?)/) ||
    n.match(/(?<!\d)(\d+(?:\.\d+)?)\s*(?:جنيه|جم|ج|ريال)(?=\s|$)/);
  if (!m) return undefined;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : undefined;
}

const has = (n: string, ...words: string[]) => words.some((w) => n.includes(w));
const ORDER_WORDS = ['طلب', 'اوردر', 'طلبيه', 'طلبيات'];
const mentionsOrder = (n: string) => has(n, ...ORDER_WORDS);

export function parseIntent(text: string, today: Date = new Date()): Intent {
  const n = normalize(text);
  if (!n) return { type: 'unknown' };

  if (/^(نعم|ايوه|ايوا|اه|اها|تمام|اكد|اكيد|موافق|ماشي|ok|yes|y|نفذ|اكد العمليه|ايوه اكد)$/.test(n)) return { type: 'confirm' };
  if (/^(لا|الغاء|الغي|الغ|مش عايز|بلاش|كنسل|cancel|no|n|لا الغي)$/.test(n)) return { type: 'cancel' };

  const code = extractCode(n);
  const status = parseStatus(n);
  const dateInfo = parseDate(n, today);

  // حذف
  if (has(n, 'احذف', 'امسح', 'شيل') && (mentionsOrder(n) || code)) {
    return { type: 'delete', code, name: code ? undefined : extractName(n) };
  }

  // تغيير الحالة
  if (has(n, 'غير', 'حدث', 'خلي', 'عدل', 'بدل') && (status || has(n, 'حاله')) && (mentionsOrder(n) || code || has(n, 'حاله'))) {
    return { type: 'status', code, name: code ? undefined : extractName(n), status };
  }

  // إضافة
  if (has(n, 'اضف', 'اضيف', 'ضيف', 'سجل', 'انشي', 'اعمل') && mentionsOrder(n)) {
    const phone = extractPhone(n);
    const notes = text.match(/(?:ملاحظه|ملاحظات|ملاحظة)\s*[:：]?\s*(.+)$/);
    return {
      type: 'add',
      name: restoreName(text, extractName(n)),
      phone,
      price: extractPrice(phone ? n.replace(phone, ' ') : n),
      date: dateInfo?.date,
      time: parseTime(n) || undefined,
      notes: notes ? notes[1].trim() : undefined,
    };
  }

  // صور
  if (has(n, 'صور', 'صوره') && (mentionsOrder(n) || code)) {
    return { type: 'images', code, name: extractName(n) };
  }

  // الساعة / التاريخ
  if (/^(كام )?(الساعه|الوقت)( كام| الان| دلوقتي)?$/.test(n)) return { type: 'time' };
  if (/^(النهارده|اليوم|التاريخ)( ايه| كام)?$/.test(n) || has(n, 'تاريخ اليوم', 'النهارده ايه', 'انهارده ايه')) return { type: 'date' };

  // المبالغ
  if (has(n, 'سعر', 'اسعار', 'مبلغ', 'مبالغ', 'اجمالي', 'ايراد', 'فلوس', 'حساب')) {
    const tn = extractName(n) || (n.match(/(?:حساب|فلوس)\s+(?:العميل\s+|العميله\s+)?(.+)/)?.[1] && cleanName(n.match(/(?:حساب|فلوس)\s+(?:العميل\s+|العميله\s+)?(.+)/)![1]));
    return { type: 'total', name: tn && !NOT_NAMES.test(tn) ? tn : undefined, status };
  }

  // عرض بالكود
  if (code && !status) return { type: 'find', code };

  const wantsCount = has(n, 'كم', 'كام', 'عدد');
  const filtered = !!(status || dateInfo || extractName(n));

  // إحصائيات عامة
  if (has(n, 'احصاي', 'ملخص', 'تقرير') || (wantsCount && !filtered && (mentionsOrder(n) || has(n, 'عندي')))) {
    return { type: 'stats' };
  }

  // عرض وبحث
  const listy =
    mentionsOrder(n) ||
    has(n, 'اعرض', 'عرض', 'وريني', 'هات', 'ابحث', 'بحث', 'دور', 'فين', 'تفاصيل', 'هيتسلم', 'يتسلم', 'تسليم', 'ميعاد', 'متاخر');
  if (listy || (wantsCount && filtered)) {
    const name = extractName(n);
    if (has(n, 'ابحث', 'بحث', 'دور', 'تفاصيل', 'فين') && name) return { type: 'find', name };
    return { type: 'list', status, date: dateInfo?.date, dateLabel: dateInfo?.label, name, ...(wantsCount ? {} : {}) };
  }

  if (/^(مرحبا|اهلا|السلام عليكم|هلا|صباح الخير|مساء الخير|هاي|ازيك|ازاي)/.test(n)) return { type: 'greeting' };
  if (has(n, 'مساعده', 'تعمل ايه', 'تقدر', 'اوامر', 'ساعدني', 'ازاي استخدمك')) return { type: 'help' };
  return { type: 'unknown' };
}

export function money(v: unknown): string {
  const num = Number(v) || 0;
  return `${num.toLocaleString('en-US')} ج.م`;
}

export function formatOrder(o: OrderLike): string {
  const parts = [`#${o.order_code} - ${o.customer_name}`, STATUS_LABELS[o.status as Status] || o.status];
  if (o.delivery_date) parts.push(`تسليم ${o.delivery_date}${o.delivery_time ? ' ' + String(o.delivery_time).slice(0, 5) : ''}`);
  parts.push(money(o.price));
  return parts.join(' | ');
}

export function formatList(orders: OrderLike[], max = 8): string {
  if (orders.length === 0) return 'لا توجد طلبات.';
  const shown = orders.slice(0, max).map((o, i) => `${i + 1}. ${formatOrder(o)}`);
  const more = orders.length > max ? `\n... و${orders.length - max} طلب آخر (افتح صفحة الطلبات للباقي)` : '';
  return shown.join('\n') + more;
}

export function matchByName(orders: OrderLike[], name: string): OrderLike[] {
  const q = normalize(name);
  if (!q) return [];
  return orders.filter((o) => normalize(o.customer_name).includes(q));
}

export function computeStats(orders: OrderLike[]) {
  const s = { total: orders.length, pending: 0, in_progress: 0, ready: 0, delivered: 0 };
  for (const o of orders) if (o.status in s) (s as any)[o.status]++;
  return s;
}

export const HELP_TEXT =
  'أقدر أساعدك في:\n' +
  '- عدد الطلبات: "عندي كم أوردر"\n' +
  '- عرض الطلبات: "اعرض الطلبات الجاهزة" أو "الطلبات اللي هتتسلم بكرة" أو "طلبات أحمد"\n' +
  '- إضافة: "أضف طلب باسم أحمد رقم 01012345678 سعر 500 تسليم بكرة"\n' +
  '- تغيير الحالة: "غير حالة الطلب 1234567 إلى جاهز"\n' +
  '- حذف: "احذف الطلب 1234567"\n' +
  '- المبالغ: "إجمالي المبالغ" أو "حساب أحمد"\n' +
  'أي إضافة أو تعديل أو حذف بأكد معاك الأول.';
