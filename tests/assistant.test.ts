import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent, normalize, parseDate } from '../src/lib/assistant';
import { handle, type Pending } from '../src/lib/assistantEngine';

const today = new Date(2026, 10, 24); // Tue 2026-11-24
const orders: any[] = [
  { id: '1', order_code: '1000001', customer_name: 'أحمد علي', phone: '01011111111', status: 'pending', price: 500, delivery_date: '2026-11-25' },
  { id: '2', order_code: '1000002', customer_name: 'سارة محمود', status: 'ready', price: 1200, delivery_date: '2026-11-24' },
  { id: '3', order_code: '1000003', customer_name: 'أحمد حسن', status: 'delivered', price: 300 },
  { id: '4', order_code: '1000004', customer_name: 'منى', status: 'in_progress', price: 800, order_images: [{}, {}] },
];
const say = (t: string, p: Pending | null = null) => handle(t, orders, p, today);

test('normalize digits/diacritics', () => {
  assert.equal(normalize('١٢٣٤٥٦٧'), '1234567');
  assert.equal(normalize('أُوردر؟'), 'اوردر');
});
test('dates', () => {
  assert.equal(parseDate('بكره', today)?.date, '2026-11-25');
  assert.equal(parseDate('بعد بكره', today)?.date, '2026-11-26');
  assert.equal(parseDate('يوم الخميس', today)?.date, '2026-11-26');
  assert.equal(parseDate('25/12', today)?.date, '2026-12-25');
});
test('the original failing question: count orders', () => {
  for (const q of ['انا عندي كم اوردر', 'أنا عندي كم أوردر؟', 'عدد الطلبات', 'كام اوردر عندي', 'احصائيات']) {
    const r = say(q);
    assert.match(r.reply, /إجمالي الطلبات: 4/, q);
    assert.equal(r.pending, null);
  }
});
test('list by status/date/name', () => {
  assert.match(say('اعرض الطلبات الجاهزة').reply, /1000002/);
  assert.doesNotMatch(say('اعرض الطلبات الجاهزة').reply, /1000001/);
  assert.match(say('الطلبات اللي هتتسلم بكرة').reply, /1000001/);
  assert.match(say('هيتسلم بكرة كام اوردر').reply, /1000001/);
  assert.match(say('طلبات سارة').reply, /سارة/);
  assert.match(say('اعرض طلبات احمد').reply, /2 طلب/);
  assert.match(say('اعرض الطلبات').reply, /4 طلب/);
});
test('lookup by code and totals', () => {
  assert.match(say('1000004').reply, /منى/);
  assert.match(say('ابحث عن طلب ١٠٠٠٠٠٤').reply, /منى/);
  assert.match(say('إجمالي المبالغ').reply, /2,800/);
  assert.match(say('حساب سارة').reply, /1,200/);
  assert.match(say('صور طلب 1000004').reply, /2 صورة/);
});
test('add flow requires confirmation and never acts early', () => {
  const r1 = say('أضف طلب باسم نور رقم 01012345678 سعر 750 تسليم بكرة');
  assert.equal(r1.action, undefined);
  assert.equal(r1.pending?.kind, 'add');
  assert.match(r1.reply, /نور/); assert.match(r1.reply, /750/); assert.match(r1.reply, /2026-11-25/); assert.match(r1.reply, /01012345678/);
  const r2 = say('نعم', r1.pending);
  assert.equal(r2.action?.kind, 'add');
  assert.equal((r2.action as any).data.name, 'نور');
  assert.equal((r2.action as any).data.price, 750);
  const r3 = say('لا', r1.pending);
  assert.equal(r3.action, undefined); assert.equal(r3.pending, null);
});
test('add without name asks for it', () => {
  const r = say('أضف طلب جديد');
  assert.equal(r.pending?.kind, 'need_name');
  const r2 = say('ليلى', r.pending);
  assert.equal(r2.pending?.kind, 'add');
  assert.equal(say('تمام', r2.pending).action?.kind, 'add');
});
test('status change', () => {
  const r = say('غير حالة الطلب 1000001 إلى جاهز');
  assert.equal(r.pending?.kind, 'status'); assert.equal(r.action, undefined);
  const a = say('أيوه', r.pending).action as any;
  assert.equal(a.status, 'ready'); assert.equal(a.id, '1');
  const r2 = say('خلي طلب منى تم التسليم');
  assert.equal((r2.pending as any).status, 'delivered');
});
test('ambiguous name requires picking', () => {
  const r = say('احذف طلب احمد');
  assert.equal(r.pending?.kind, 'pick');
  assert.equal(r.action, undefined);
  const r2 = say('2', r.pending);
  assert.equal(r2.pending?.kind, 'delete');
  assert.equal((r2.pending as any).code, '1000003');
  assert.equal(say('نعم', r2.pending).action?.kind, 'delete');
});
test('delete by code needs confirm; unknown code handled', () => {
  const r = say('احذف الطلب 1000002');
  assert.equal(r.pending?.kind, 'delete'); assert.equal(r.action, undefined);
  assert.match(say('احذف الطلب 9999999').reply, /لم أجد/);
});
test('no fake success: bare confirm without pending does nothing', () => {
  const r = say('نعم');
  assert.equal(r.action, undefined);
});
test('unknown text gives guidance not greeting', () => {
  assert.match(say('بلا بلا بلا').reply, /ماقدرتش أفهم/);
});
test('new command replaces stale pending without executing it', () => {
  const r = say('احذف الطلب 1000002');
  const r2 = say('عندي كم اوردر', r.pending);
  assert.equal(r2.action, undefined);
  assert.match(r2.reply, /إجمالي/);
  assert.equal(r2.pending, null);
});
test('arabic digits & colloquial variants', () => {
  assert.match(say('احذف الطلب ١٠٠٠٠٠٢').reply, /1000002/);
  assert.match(say('ورّيني الأوردرات الجاهزة').reply, /1000002/);
  assert.match(say('الاوردرات المتأخرة').reply.length > 0 ? 'x' : '', /x/);
  assert.match(say('كام اوردر جاهز').reply, /1 طلب/);
  assert.match(say('عايز اضيف اوردر جديد باسم هدى').reply, /هدى/);
  assert.equal(say('مرحبا').pending, null);
  assert.match(say('مساعدة').reply, /أقدر أساعدك/);
});
test('add with time and notes', () => {
  const r = say('سجل طلب باسم دعاء سعر 1500 جنيه تسليم يوم الخميس الساعة 5 مساء ملاحظة: فستان سهرة');
  const d = (r.pending as any).data;
  assert.equal(d.name, 'دعاء'); assert.equal(d.price, 1500);
  assert.equal(d.date, '2026-11-26'); assert.equal(d.time, '17:00'); assert.match(d.notes, /فستان/);
});

import { toWhatsAppNumber, whatsAppLink, buildMessage } from '../src/lib/whatsapp';
test('whatsapp numbers', () => {
  assert.equal(toWhatsAppNumber('01012345678'), '201012345678');
  assert.equal(toWhatsAppNumber('٠١٠١٢٣٤٥٦٧٨'), '201012345678');
  assert.equal(toWhatsAppNumber('+201112345678'), '201112345678');
  assert.equal(toWhatsAppNumber('0020 101 234 5678'), '201012345678');
  assert.equal(toWhatsAppNumber('0123'), null);
  assert.equal(toWhatsAppNumber(''), null);
  assert.equal(toWhatsAppNumber('201312345678'), null);
});
test('whatsapp link/message', () => {
  const o: any = { customer_name: 'سارة', order_code: '1000002', status: 'ready', delivery_date: '2026-11-24', delivery_time: '17:00:00' };
  const l = whatsAppLink('01012345678', o)!;
  assert.match(l, /^https:\/\/wa\.me\/201012345678\?text=/);
  assert.match(decodeURIComponent(l.split('text=')[1]), /جاهز/);
  assert.match(buildMessage(o), /17:00/);
  assert.equal(whatsAppLink('', o), null);
});
