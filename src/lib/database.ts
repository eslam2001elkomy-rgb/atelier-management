import { supabase } from './supabase';

// 1. توليد كود فريد للطلب مكون من 7 أرقام
export async function generateOrderCode(): Promise<string> {
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    code = Math.floor(1000000 + Math.random() * 9000000).toString();
    
    const { data, error } = await supabase
      .from('orders')
      .select('order_code')
      .eq('order_code', code)
      .maybeSingle();
    
    if (!error && !data) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error('فشل في توليد كود فريد للأوردر، يرجى المحاولة مرة أخرى.');
  }

  return code;
}

// 2. جلب جميع الطلبات للوحة التحكم وقائمة الطلبات
export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_images(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// 3. جلب طلب معين باستخدام الـ ID
export async function fetchOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_images(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 4. تتبع الطلب باستخدام كود السبعة أرقام
export async function fetchOrderByCode(code: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('customer_name, status, order_images(*)')
    .eq('order_code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 5. إضافة طلب جديد وربطه بالعميل بشكل صحيح بدون أخطاء
export async function createOrder(order: {
  order_code: string;
  customer_name: string;
  phone: string;
  delivery_date: string | null;
  delivery_time: string | null;
  price: number;
  notes: string;
  status: string;
}) {
  let customerId: string | null = null;

  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', order.phone)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else if (order.phone) {
    const { data: newCustomer, error: custError } = await supabase
      .from('customers')
      .insert({ name: order.customer_name, phone: order.phone })
      .select('id')
      .maybeSingle();
      
    if (custError) console.error('خطأ أثناء تسجيل العميل الجديد:', custError);
    if (newCustomer) customerId = newCustomer.id;
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_code: order.order_code,
      customer_name: order.customer_name,
      phone: order.phone,
      delivery_date: order.delivery_date,
      delivery_time: order.delivery_time,
      price: order.price,
      notes: order.notes,
      status: order.status,
      customer_id: customerId
    })
    .select('*, order_images(*)')
    .maybeSingle();

  if (error) throw error;
  return data;
}

// 6. تحديث بيانات الطلب أو حالته
export async function updateOrder(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, order_images(*)')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 7. حذف الطلب وحذف صوره من الـ Storage
export async function deleteOrder(id: string) {
  const { data: images } = await supabase
    .from('order_images')
    .select('image_url')
    .eq('order_id', id);

  if (images && images.length > 0) {
    for (const img of images) {
      try {
        const urlParts = img.image_url.split('/order-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('order-images').remove([filePath]);
        }
      } catch (e) {
        console.error('فشل مسح ملف الصورة من الـ Storage:', e);
      }
    }
  }

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// 8. رفع صورة جديدة للطلب
export async function uploadOrderImage(orderId: string, file: File) {
  const ext = file.name.split('.').pop();
  const fileName = `${orderId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('order-images')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('order-images')
    .getPublicUrl(fileName);

  const { data, error } = await supabase
    .from('order_images')
    .insert({ order_id: orderId, image_url: publicUrl })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 9. حذف صورة معينة للطلب
export async function deleteOrderImage(id: string) {
  const { data: imgData } = await supabase
    .from('order_images')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  if (imgData) {
    const urlParts = imgData.image_url.split('/order-images/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from('order-images').remove([filePath]);
    }
  }

  const { error } = await supabase
    .from('order_images')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// 10. جلب العملاء لصفحة العملاء
export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// 11. حذف عميل
export async function deleteCustomer(id: string) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// 12. الإشعارات
export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function createNotification(notification: {
  user_id: string;
  order_id?: string;
  title: string;
  message: string;
  type: string;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// 13. حفظ محادثات الذكاء الاصطناعي
export async function saveConversation(conversation: {
  user_id: string;
  user_message: string;
  assistant_response: string;
  action_taken?: string;
}) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert(conversation)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

// 14. الإعدادات
export async function fetchSettings(userId: string) {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function upsertSetting(userId: string, key: string, value: string) {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
