import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const laterStr = threeHoursLater.toISOString().split("T")[0];

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_code, customer_name, delivery_date, delivery_time, status, user_id")
      .neq("status", "delivered")
      .gte("delivery_date", todayStr)
      .lte("delivery_date", laterStr);

    if (ordersError) throw ordersError;

    let notificationsCreated = 0;

    for (const order of orders || []) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("order_id", order.id)
        .eq("type", "reminder")
        .gte("created_at", todayStr)
        .maybeSingle();

      if (existing) continue;

      const { data: users } = await supabase
        .from("users")
        .select("id, phone")
        .limit(1);

      const userId = users?.[0]?.id;
      if (!userId) continue;

      const deliveryInfo = order.delivery_time
        ? `${order.delivery_date} الساعة ${order.delivery_time}`
        : order.delivery_date;

      await supabase.from("notifications").insert({
        user_id: userId,
        order_id: order.id,
        title: "تذكير بتسليم طلب",
        message: `الطلب ${order.order_code} للعميل ${order.customer_name} مستحق التسليم: ${deliveryInfo}`,
        type: "reminder",
      });

      notificationsCreated++;
    }

    return new Response(
      JSON.stringify({ success: true, notificationsCreated, checkedOrders: orders?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
