import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";

// On first login, auto-assign the demo tenant + owner role so the user has a working store immediately.
export const ensureTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();

    if (profile?.tenant_id) return { tenantId: profile.tenant_id };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").upsert({ id: userId, tenant_id: DEMO_TENANT_ID });
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "owner" }, { onConflict: "user_id,role" });
    return { tenantId: DEMO_TENANT_ID };
  });
