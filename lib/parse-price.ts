/** 物件価格文字列を万円単位にパース（比較表・分析・シミュで共通） */
export function parsePriceWan(priceStr: string): number {
  const s = priceStr.trim();
  if (!s) return 0;
  if (/^(0|無償|無料|格安)$/i.test(s)) return 0;
  if (/無償|0円|無料/i.test(s)) return 0;

  const wanMatch = s.match(/([0-9,，]+)\s*万円?/);
  if (wanMatch) return parseFloat(wanMatch[1].replace(/[,，]/g, ""));

  if (/円/.test(s) && !/万/.test(s)) {
    const yenMatch = s.match(/([0-9,，]+)\s*円/);
    if (yenMatch) {
      return Math.round((parseFloat(yenMatch[1].replace(/[,，]/g, "")) / 10000) * 10) / 10;
    }
  }

  const bare = s.match(/^[\s]*([0-9,，]+)[\s]*$/);
  if (bare) return parseFloat(bare[1].replace(/[,，]/g, ""));

  return 0;
}

/** 比較表用：パース不能なら null */
export function parsePriceWanOrNull(priceStr: string): number | null {
  if (!priceStr?.trim()) return null;
  if (/無償|0円|無料|格安/i.test(priceStr)) return 0;
  if (/万/.test(priceStr) || (/円/.test(priceStr) && /[0-9]/.test(priceStr))) {
    return parsePriceWan(priceStr);
  }
  const bare = priceStr.match(/([0-9,，]+)/);
  if (bare) return parseFloat(bare[1].replace(/[,，]/g, ""));
  return null;
}
