import { NextRequest, NextResponse } from "next/server";
import {
  checkFetchRateLimit,
  validatePropertyFetchUrl,
} from "@/lib/fetch-property-guard";

export async function POST(req: NextRequest) {
  const clientKey =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";

  const rate = checkFetchRateLimit(clientKey);
  if (!rate.ok) {
    return NextResponse.json({ error: rate.error }, { status: 429 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const urlStr = body.url?.trim() ?? "";
  const validated = validatePropertyFetchUrl(urlStr);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const url = validated.url.href;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "ページを取得できませんでした" }, { status: 502 });
    }

    const html = await res.text();

    const jsonLdMatches = [
      ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    const structured: Record<string, string> = {};

    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const item = Array.isArray(data) ? data[0] : data;
        if (
          item["@type"] &&
          (item["@type"].includes("Residence") ||
            item["@type"].includes("House") ||
            item["@type"].includes("RealEstate") ||
            item.name)
        ) {
          if (item.name) structured.name = item.name;
          if (item.address) {
            const addr =
              typeof item.address === "string"
                ? item.address
                : item.address.streetAddress || item.address.addressLocality || "";
            if (addr) structured.location = addr;
          }
          if (item.floorSize?.value) structured.area = item.floorSize.value + "㎡";
          if (item.price) structured.price = item.price;
          if (item.numberOfRooms) structured.notes = `間取り: ${item.numberOfRooms}`;
        }
      } catch {
        /* ignore invalid JSON-LD */
      }
    }

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

    if (!parsed.price) {
      const pricePatterns = [
        /売買価格[^\d]*([0-9,，]+)\s*万円/,
        /価格[^\d\n]*?([0-9,，]+)\s*万円/,
        /([0-9,，]{3,})\s*万円/,
        /(無償譲渡|0\s*円|格安|応相談)/,
      ];
      for (const p of pricePatterns) {
        const m = m2text.match(p);
        if (m) {
          parsed.price = m[1] ? m[1].replace(/，/g, ",") + "万円" : m[0];
          break;
        }
      }
    }

    if (!parsed.area) {
      const areaPatterns = [
        /建物[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
        /専有面積\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
        /延床[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
        /床面積\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
      ];
      for (const p of areaPatterns) {
        const m = m2text.match(p);
        if (m) {
          parsed.area = m[1] + "㎡";
          break;
        }
      }
    }

    const landPatterns = [
      /土地[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
      /敷地[面積]*\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
      /地積\s*[：:\s]\s*([0-9,.]+)\s*㎡/,
    ];
    for (const p of landPatterns) {
      const m = m2text.match(p);
      if (m) {
        parsed.landArea = m[1] + "㎡";
        break;
      }
    }

    const yearPatterns = [
      /築年月\s*[：:\s]*([0-9]{4}年[0-9]{1,2}月)/,
      /([0-9]{4}年[0-9]{1,2}月)\s*築/,
      /築\s*([0-9]{1,3})\s*年/,
    ];
    for (const p of yearPatterns) {
      const m = m2text.match(p);
      if (m) {
        parsed.builtYear = m[1].includes("月") ? m[1] + "築" : `築${m[1]}年`;
        break;
      }
    }

    if (!parsed.location) {
      const locPatterns = [
        /所在地\s*[：:\s]*([^\n\r]{5,50})/,
        /([一-龥]{2,4}県[^\s\n\r　]{2,30})/,
      ];
      for (const p of locPatterns) {
        const m = m2text.match(p);
        if (m) {
          parsed.location = m[1].trim().slice(0, 50);
          break;
        }
      }
    }

    const madoriMatch = m2text.match(/間取り\s*[：:\s]*([0-9LKDS+]+[LKDS])/);
    if (madoriMatch) {
      parsed.notes = [parsed.notes, `間取り: ${madoriMatch[1]}`].filter(Boolean).join("\n");
    }

    const host = validated.url.hostname;
    if (host.includes("athome")) parsed.platform = "アットホーム";
    else if (host.includes("rakumachi")) parsed.platform = "楽待";
    else if (host.includes("suumo")) parsed.platform = "SUUMO";
    else if (host.includes("ieichiba")) parsed.platform = "家いちば";
    else if (host.includes("zero-yen") || host.includes("0en") || host.includes("0yen"))
      parsed.platform = "0円物件";

    parsed.url = url;

    return NextResponse.json({ parsed });
  } catch {
    return NextResponse.json({ error: "ページの取得に失敗しました" }, { status: 500 });
  }
}
