import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `取得失敗 (${res.status})` }, { status: 502 });
    }

    const html = await res.text();

    // ① JSON-LD (schema.org) から構造化データを取得（一番精度が高い）
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    let structured: Record<string, string> = {};

    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const item = Array.isArray(data) ? data[0] : data;
        if (item["@type"] && (item["@type"].includes("Residence") || item["@type"].includes("House") || item["@type"].includes("RealEstate") || item["name"])) {
          if (item.name) structured.name = item.name;
          if (item.address) {
            const addr = typeof item.address === "string" ? item.address : (item.address.streetAddress || item.address.addressLocality || "");
            if (addr) structured.location = addr;
          }
          if (item.floorSize?.value) structured.area = item.floorSize.value + "㎡";
          if (item.price) structured.price = item.price;
          if (item.numberOfRooms) structured.notes = `間取り: ${item.numberOfRooms}`;
        }
      } catch {}
    }

    // ② HTMLからテキストを抽出してregexパース
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#[0-9]+;/g, " ")
      .replace(/\s{2,}/g, "\n")
      .trim();

    const m2text = text.replace(/m²|m2/gi, "㎡");

    const parsed: Record<string, string> = { ...structured };

    // 価格
    if (!parsed.price) {
      const pricePatterns = [
        /売買価格[^\d]*([0-9,，]+)\s*万円/,
        /価格[^\d\n]*?([0-9,，]+)\s*万円/,
        /([0-9,，]{3,})\s*万円/,
        /(無償譲渡|0\s*円|格安|応相談)/,
      ];
      for (const p of pricePatterns) {
        const m = m2text.match(p);
        if (m) { parsed.price = m[1] ? m[1].replace(/，/g, ",") + "万円" : m[0]; break; }
      }
    }

    // 建物面積
    if (!parsed.area) {
      const areaPatterns = [
        /建物[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
        /専有面積\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
        /延床[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
        /床面積\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
      ];
      for (const p of areaPatterns) {
        const m = m2text.match(p);
        if (m) { parsed.area = m[1] + "㎡"; break; }
      }
    }

    // 土地面積
    const landPatterns = [
      /土地[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
      /敷地[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
      /地積\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
    ];
    for (const p of landPatterns) {
      const m = m2text.match(p);
      if (m) { parsed.landArea = m[1] + "㎡"; break; }
    }

    // 築年月
    const yearPatterns = [
      /築年月\s*[：:\s]*([0-9]{4}年[0-9]{1,2}月)/,
      /([0-9]{4}年[0-9]{1,2}月)\s*築/,
      /築\s*([0-9]{1,3})\s*年/,
    ];
    for (const p of yearPatterns) {
      const m = m2text.match(p);
      if (m) { parsed.builtYear = m[1].includes("月") ? m[1] + "築" : `築${m[1]}年`; break; }
    }

    // 所在地
    if (!parsed.location) {
      const locPatterns = [
        /所在地\s*[：:\s]*([^\n\r]{5,40})/,
        /(鹿[児]?島県[^\s\n\r　]{3,25})/,
        /(宮崎県[^\s\n\r　]{3,25})/,
        /(熊本県[^\s\n\r　]{3,25})/,
        /(福岡県[^\s\n\r　]{3,25})/,
      ];
      for (const p of locPatterns) {
        const m = m2text.match(p);
        if (m) { parsed.location = m[1].trim().slice(0, 40); break; }
      }
    }

    // 間取り
    const madoriMatch = m2text.match(/間取り\s*[：:\s]*([0-9LKDS+]+[LKDS])/);
    if (madoriMatch) {
      parsed.notes = [parsed.notes, `間取り: ${madoriMatch[1]}`].filter(Boolean).join("\n");
    }

    // プラットフォーム自動検出
    if (url.includes("athome")) parsed.platform = "アットホーム";
    else if (url.includes("rakumachi")) parsed.platform = "楽待";
    else if (url.includes("suumo")) parsed.platform = "SUUMO";
    else if (url.includes("ieichiba")) parsed.platform = "家いちば";
    else if (url.includes("zero-yen") || url.includes("0en")) parsed.platform = "0円物件";

    parsed.url = url;

    return NextResponse.json({ parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: `取得エラー: ${msg}` }, { status: 500 });
  }
}
