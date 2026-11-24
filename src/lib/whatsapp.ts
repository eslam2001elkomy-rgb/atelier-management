// تجهيز رسالة واتساب للعميل. لا يتم الإرسال تلقائيًا: الرابط يفتح واتساب برسالة جاهزة تراجعها وتضغط إرسال بنفسك.

/** يحول رقم مصري محلي (01xxxxxxxxx) أو دولي إلى صيغة دولية بدون + (مثل 201012345678). يرجع null لو الرقم غير صالح */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (/^01[0125]\d{8}$/.test(d)) d = '20' + d.slice(1);
  if (!/^\d{10,15}$/.test(d)) return null;
  if (d.startsWith('20') && !/^201[0125]\d{8}$/.test(d)) return null; // رقم مصري لازم يكون موبايل صحيح
  return d;
}

export interface WaOrder {
  customer_name: string;
  order_code?: string | null;
  status: string;
  delivery_date?: string | null;
  delivery_time?: string | null;
  price?: number | string | null;
}

export function buildMessage(o: WaOrder, shop = 'الأتيليه'): string {
  const when = o.delivery_date ? `${o.delivery_date}${o.delivery_time ? ' الساعة ' + String(o.delivery_time).slice(0, 5) : ''}` : '';
  const code = o.order_code ? `\nرقم الطلب: ${o.order_code}` : '';
  switch (o.status) {
    case 'ready':
      return `أهلاً ${o.customer_name}، طلبك جاهز للاستلام من ${shop}.${code}${when ? '\nموعد التسليم: ' + when : ''}\nشكراً لك.`;
    case 'delivered':
      return `أهلاً ${o.customer_name}، شكراً لتعاملك مع ${shop}. نتمنى أن يكون الطلب عند حسن ظنك.${code}`;
    case 'in_progress':
      return `أهلاً ${o.customer_name}، طلبك قيد التنفيذ الآن في ${shop}.${code}${when ? '\nموعد التسليم المتوقع: ' + when : ''}`;
    default:
      return `أهلاً ${o.customer_name}، استلمنا طلبك في ${shop}.${code}${when ? '\nموعد التسليم المتوقع: ' + when : ''}\nسنبلغك عند اكتماله.`;
  }
}

export function whatsAppLink(phone: string | null | undefined, o: WaOrder, shop?: string): string | null {
  const n = toWhatsAppNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(buildMessage(o, shop))}`;
}
