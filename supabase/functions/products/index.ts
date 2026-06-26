import { withSupabase } from "@supabase/server"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path.endsWith("/products") || path === "/" || path.endsWith("/products/")) {
        if (req.method === "GET") {
          const category = url.searchParams.get("category") || "All";
          const limit = parseInt(url.searchParams.get("limit") || "50", 10);
          const cursor = url.searchParams.get("cursor");

          let query = ctx.supabase
            .from("products")
            .select("id, name, category, price, created_at, updated_at")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit + 1);

          if (category !== "All") {
            query = query.eq("category", category);
          }

          if (cursor) {
            try {
              const decoded = JSON.parse(atob(cursor));
              const cursor_ts = decoded.c;
              const cursor_id = decoded.i;
              query = query.or(`created_at.lt.${cursor_ts},and(created_at.eq.${cursor_ts},id.lt.${cursor_id})`);
            } catch (e) {
              return new Response(JSON.stringify({ error: `Invalid cursor: ${e.message}` }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }

          const { data: rows, error } = await query;
          if (error) throw error;

          const hasMore = rows.length > limit;
          const items = rows.slice(0, limit);

          let nextCursor = null;
          if (hasMore && items.length > 0) {
            const last = items[items.length - 1];
            nextCursor = btoa(JSON.stringify({ c: last.created_at, i: last.id }));
          }

          return new Response(
            JSON.stringify({ data: items, next_cursor: nextCursor }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (req.method === "POST") {
          const body = await req.json();
          const { name, category, price } = body;

          const { data, error } = await ctx.supabase
            .from("products")
            .insert([{ name, category, price }])
            .select()
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify(data),
            { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (path.endsWith("/categories") || path.endsWith("/categories/")) {
        const { data, error } = await ctx.supabase.rpc("get_category_counts");
        if (error) throw error;

        const categories = data.map(r => ({ name: r.category, count: r.count }));
        const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

        return new Response(
          JSON.stringify([{ name: "All", count: totalCount }, ...categories]),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  })
}
