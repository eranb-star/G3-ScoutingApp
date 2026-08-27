const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const feeds: Record<string, { url: string; category: string }> = {
  all: { url: "https://www.chiefdelphi.com/latest.rss", category: "FRC" },
  technical: { url: "https://www.chiefdelphi.com/c/technical.rss", category: "Technical" },
  software: { url: "https://www.chiefdelphi.com/tag/programming.rss", category: "Software" },
  strategy: { url: "https://www.chiefdelphi.com/tag/strategy.rss", category: "Strategy" },
};

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function field(item: string, name: string) {
  return item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const selected = feeds[typeof body.feed === "string" ? body.feed : "all"] ?? feeds.all;
    const response = await fetch(selected.url, { headers: { "User-Agent": "G3-Team-Hub/1.0 (+https://github.com/eranb-star/G3-ScoutingApp)", Accept: "application/rss+xml, application/xml" } });
    if (!response.ok) throw new Error(`Chief Delphi returned ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 18).map((match, index) => {
      const item = match[1];
      const url = decode(field(item, "link"));
      return { id: field(item, "guid") || url || String(index), title: decode(field(item, "title")), excerpt: decode(field(item, "description")).slice(0, 320), url, publishedAt: decode(field(item, "pubDate")), category: decode(field(item, "category")) || selected.category };
    }).filter((item) => item.title && item.url.startsWith("https://www.chiefdelphi.com/"));
    return new Response(JSON.stringify({ items, source: "Chief Delphi", sourceUrl: selected.url }), { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Feed unavailable" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
