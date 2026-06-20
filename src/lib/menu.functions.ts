import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMenu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: sizes }, { data: addons }, { data: zones }, { data: tenant }] = await Promise.all([
      supabase.from("sizes").select("*").eq("active", true).order("display_order"),
      supabase.from("addons").select("*").eq("active", true).order("category").order("name"),
      supabase.from("delivery_zones").select("*").eq("active", true).order("fee"),
      supabase.from("tenants").select("*").limit(1).maybeSingle(),
    ]);
    return { sizes: sizes ?? [], addons: addons ?? [], zones: zones ?? [], tenant };
  });
