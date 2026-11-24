import {
  parseIntent, formatList, formatOrder, matchByName, computeStats, money, normalize, localDateStr,
  HELP_TEXT, STATUS_LABELS,
  type Intent, type OrderLike, type Status,
} from './assistant';

export interface AddData {
  name: string; phone: string; price: number; date: string | null; time: string | null; notes: string;
}

export type Pending =
  | { kind: 'need_name'; draft: Omit<AddData, 'name'> }
  | { kind: 'add'; data: AddData }
  | { kind: 'status'; id: string; code: string; name: string; status: Status }
  | { kind: 'delete'; id: string; code: string; name: string }
  | { kind: 'pick'; intent: 'status' | 'delete'; status?: Status; options: OrderLike[] }
  | { kind: 'need_status'; id: string; code: string; name: string };

export type Action =
  | { kind: 'add'; data: AddData }
  | { kind: 'status'; id: string; code: string; name: string; status: Status }
  | { kind: 'delete'; id: string; code: string; name: string };

export interface Result {
  reply: string;
  pending: Pending | null;
  action?: Action; // عملية يجب تنفيذها الآن (بعد التأكيد فقط)
}

const statusWord = (s: Status) => STATUS_LABELS[s];

function resolveOrder(
  orders: OrderLike[], code?: string, name?: string,
): { order?: OrderLike; many?: OrderLike[]; error?: string } {
  if (code) {
    const o = orders.find((x) => x.order_code === code);
    return o ? { order: o } : { error: `لم أجد طلبًا بالرقم ${code}.` };
  }
  if (name) {
    const found = matchByName(orders, name);
    if (found.length === 1) return { order: found[0] };
    if (found.length > 1) return { many: found };
    return { error: `لم أجد طلبًا باسم "${name}".` };
  }
  return { error: 'حدد رقم الطلب (7 أرقام) أو اسم العميل.' };
}

function describeAdd(d: AddData): string {
  const lines = [`الاسم: ${d.name}`];
  if (d.phone) lines.push(`الموبايل: ${d.phone}`);
  lines.push(`السعر: ${money(d.price)}`);
  lines.push(`التسليم: ${d.date ? d.date + (d.time ? ' ' + d.time : '') : 'غير محدد'}`);
  if (d.notes) lines.push(`ملاحظات: ${d.notes}`);
  return lines.join('\n');
}

function listReply(orders: OrderLike[], i: Extract<Intent, { type: 'list' }>): string {
  let r = orders;
  const parts: string[] = [];
  if (i.name) { r = matchByName(r, i.name); parts.push(`للعميل "${i.name}"`); }
  if (i.status) { r = r.filter((o) => o.status === i.status); parts.push(statusWord(i.status)); }
  if (i.date) { r = r.filter((o) => o.delivery_date === i.date); parts.push(`تسليم ${i.dateLabel || i.date}`); }
  if (!i.name && !i.status && !i.date) r = r.slice();
  const head = r.length === 0 ? `لا توجد طلبات${parts.length ? ' ' + parts.join(' - ') : ''}.` : `${r.length} طلب${parts.length ? ' ' + parts.join(' - ') : ''}:`;
  return r.length === 0 ? head : `${head}\n${formatList(r)}`;
}

export function handle(text: string, orders: OrderLike[], pending: Pending | null, today: Date = new Date()): Result {
  const intent = parseIntent(text, today);
  const n = normalize(text);

  // ----- متابعة سؤال سابق -----
  if (pending) {
    if (intent.type === 'cancel') return { reply: 'تمام، ألغيت العملية.', pending: null };

    if (pending.kind === 'need_name') {
      if (intent.type === 'unknown' || intent.type === 'confirm') {
        const name = text.trim();
        if (intent.type === 'confirm' || name.length < 2) return { reply: 'اكتب اسم العميل للطلب الجديد (أو قل "إلغاء").', pending };
        const data: AddData = { ...pending.draft, name };
        return { reply: `هضيف الطلب ده:\n${describeAdd(data)}\nأأكد الإضافة؟ (نعم / لا)`, pending: { kind: 'add', data } };
      }
    } else if (pending.kind === 'pick') {
      const num = n.match(/^\d{1,2}$/);
      const code = n.match(/(?<!\d)\d{7}(?!\d)/);
      const choice = code ? pending.options.find((o) => o.order_code === code[0]) : num ? pending.options[Number(num[0]) - 1] : undefined;
      if (choice) {
        if (pending.intent === 'delete') {
          return { reply: `هحذف الطلب ${formatOrder(choice)}. الحذف نهائي. أأكد؟ (نعم / لا)`, pending: { kind: 'delete', id: choice.id, code: choice.order_code, name: choice.customer_name } };
        }
        if (pending.status) {
          return { reply: `هغير حالة الطلب #${choice.order_code} (${choice.customer_name}) إلى ${statusWord(pending.status)}. أأكد؟ (نعم / لا)`, pending: { kind: 'status', id: choice.id, code: choice.order_code, name: choice.customer_name, status: pending.status } };
        }
      }
      if (intent.type === 'unknown' || num || code) return { reply: 'اختار رقم من القائمة أو اكتب رقم الطلب (7 أرقام)، أو قل "إلغاء".', pending };
    } else if (pending.kind === 'need_status') {
      const st = (intent as any).status || parseIntent(`غير حالة ${text}`, today);
      const s: Status | undefined = (st as any).status;
      if (s) return { reply: `هغير حالة الطلب #${pending.code} (${pending.name}) إلى ${statusWord(s)}. أأكد؟ (نعم / لا)`, pending: { kind: 'status', id: pending.id, code: pending.code, name: pending.name, status: s } };
      if (intent.type === 'unknown') return { reply: 'قل الحالة الجديدة: قيد الانتظار، قيد التنفيذ، جاهز، أو تم التسليم.', pending };
    } else {
      // add / status / delete تنتظر تأكيدًا
      if (intent.type === 'confirm') {
        if (pending.kind === 'add') return { reply: 'جاري إضافة الطلب...', pending: null, action: { kind: 'add', data: pending.data } };
        if (pending.kind === 'status') return { reply: 'جاري تغيير الحالة...', pending: null, action: { kind: 'status', id: pending.id, code: pending.code, name: pending.name, status: pending.status } };
        if (pending.kind === 'delete') return { reply: 'جاري الحذف...', pending: null, action: { kind: 'delete', id: pending.id, code: pending.code, name: pending.name } };
      }
      if (intent.type === 'unknown') return { reply: 'محتاج تأكيد: قل "نعم" للتنفيذ أو "لا" للإلغاء.', pending };
      // أمر جديد مختلف: نلغي القديم ونكمل
    }
  } else if (intent.type === 'confirm' || intent.type === 'cancel') {
    return { reply: 'مفيش عملية معلقة دلوقتي. اكتب "مساعدة" لو عايز تعرف أقدر أعمل إيه.', pending: null };
  }

  // ----- أمر جديد -----
  switch (intent.type) {
    case 'greeting':
      return { reply: 'أهلاً بيك! اسألني عن الطلبات أو قولي أضيف أو أعدل طلب. اكتب "مساعدة" للأمثلة.', pending: null };
    case 'help':
      return { reply: HELP_TEXT, pending: null };
    case 'time':
      return { reply: `الساعة الآن ${today.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`, pending: null };
    case 'date':
      return { reply: `اليوم ${localDateStr(today)}`, pending: null };
    case 'stats': {
      const s = computeStats(orders);
      return {
        reply: `إجمالي الطلبات: ${s.total}\nقيد الانتظار: ${s.pending}\nقيد التنفيذ: ${s.in_progress}\nجاهز: ${s.ready}\nتم التسليم: ${s.delivered}`,
        pending: null,
      };
    }
    case 'list':
      return { reply: listReply(orders, intent), pending: null };
    case 'find': {
      const r = resolveOrder(orders, intent.code, intent.name);
      if (r.error) return { reply: r.error, pending: null };
      if (r.many) return { reply: `لقيت ${r.many.length} طلبات:\n${formatList(r.many)}`, pending: null };
      const o = r.order!;
      return { reply: `${formatOrder(o)}${o.phone ? '\nموبايل: ' + o.phone : ''}`, pending: null };
    }
    case 'total': {
      let r = orders;
      if (intent.name) r = matchByName(r, intent.name);
      if (intent.status) r = r.filter((o) => o.status === intent.status);
      if (intent.name && r.length === 0) return { reply: `لم أجد طلبات باسم "${intent.name}".`, pending: null };
      const sum = r.reduce((a, o) => a + (Number(o.price) || 0), 0);
      return { reply: `إجمالي مبالغ ${r.length} طلب${intent.name ? ` للعميل "${intent.name}"` : ''}${intent.status ? ' (' + statusWord(intent.status) + ')' : ''}: ${money(sum)}`, pending: null };
    }
    case 'images': {
      const r = resolveOrder(orders, intent.code, intent.name);
      if (r.error) return { reply: r.error, pending: null };
      if (r.many) return { reply: `لقيت ${r.many.length} طلبات، حدد رقم الطلب:\n${formatList(r.many)}`, pending: null };
      const c = r.order!.order_images?.length || 0;
      return { reply: c ? `طلب ${r.order!.customer_name} فيه ${c} صورة. افتحه من صفحة الطلبات لعرضها.` : `طلب ${r.order!.customer_name} مفيهوش صور.`, pending: null };
    }
    case 'add': {
      const draft = { phone: intent.phone || '', price: intent.price ?? 0, date: intent.date || null, time: intent.time || null, notes: intent.notes || '' };
      if (!intent.name) return { reply: 'اسم العميل إيه؟', pending: { kind: 'need_name', draft } };
      const data: AddData = { name: intent.name, ...draft };
      return { reply: `هضيف الطلب ده:\n${describeAdd(data)}\nأأكد الإضافة؟ (نعم / لا)`, pending: { kind: 'add', data } };
    }
    case 'status': {
      const r = resolveOrder(orders, intent.code, intent.name);
      if (r.error) return { reply: r.error, pending: null };
      if (r.many) {
        return { reply: `في ${r.many.length} طلبات بالاسم ده، اختار رقم:\n${formatList(r.many)}`, pending: { kind: 'pick', intent: 'status', status: intent.status, options: r.many.slice(0, 20) } };
      }
      const o = r.order!;
      if (!intent.status) return { reply: `الحالة الجديدة للطلب #${o.order_code} إيه؟ (قيد الانتظار / قيد التنفيذ / جاهز / تم التسليم)`, pending: { kind: 'need_status', id: o.id, code: o.order_code, name: o.customer_name } };
      if (o.status === intent.status) return { reply: `الطلب #${o.order_code} حالته بالفعل ${statusWord(intent.status)}.`, pending: null };
      return { reply: `هغير حالة الطلب #${o.order_code} (${o.customer_name}) من ${STATUS_LABELS[o.status as Status] || o.status} إلى ${statusWord(intent.status)}. أأكد؟ (نعم / لا)`, pending: { kind: 'status', id: o.id, code: o.order_code, name: o.customer_name, status: intent.status } };
    }
    case 'delete': {
      const r = resolveOrder(orders, intent.code, intent.name);
      if (r.error) return { reply: r.error, pending: null };
      if (r.many) return { reply: `في ${r.many.length} طلبات بالاسم ده، اختار رقم:\n${formatList(r.many)}`, pending: { kind: 'pick', intent: 'delete', options: r.many.slice(0, 20) } };
      const o = r.order!;
      return { reply: `هحذف الطلب ${formatOrder(o)}. الحذف نهائي. أأكد؟ (نعم / لا)`, pending: { kind: 'delete', id: o.id, code: o.order_code, name: o.customer_name } };
    }
    default:
      return { reply: 'ماقدرتش أفهم الطلب. جرب مثلاً: "عندي كم أوردر" أو "اعرض الطلبات الجاهزة" أو "أضف طلب باسم أحمد". اكتب "مساعدة" للأمثلة.', pending: pending && pending.kind !== 'add' && pending.kind !== 'status' && pending.kind !== 'delete' ? pending : null };
  }
}
