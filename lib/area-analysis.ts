/** 全国共通のざっくりエリア区分（詳細な路線価は国税庁で確認） */
export type AreaTierId = "depopulated" | "rural" | "regional" | "pref_capital";

export const ROSENKA_LOOKUP_URL = "https://www.rosenka.nta.go.jp/";

export const AREA_TIERS: Record<
  AreaTierId,
  {
    label: string;
    shortLabel: string;
    rosenkaPerSqm: number;
    marketPerSqm: number;
    rentPerSqm: number;
    minRentWan: number;
    market: string;
  }
> = {
  depopulated: {
    label: "過疎・山間・町村クラス",
    shortLabel: "過疎寄り",
    rosenkaPerSqm: 3000,
    marketPerSqm: 4000,
    rentPerSqm: 350,
    minRentWan: 2,
    market:
      "人口減少が進む地域の目安。0円・格安物件が出やすい一方、入居者獲得・維持に発信力が必要になりやすい。",
  },
  rural: {
    label: "地方・農村エリア",
    shortLabel: "地方農村",
    rosenkaPerSqm: 8000,
    marketPerSqm: 10000,
    rentPerSqm: 500,
    minRentWan: 2.5,
    market:
      "県内の農村部・郊外の一般的な目安。移住・二拠点・DIY賃貸などニッチな入居者設計が有効。",
  },
  regional: {
    label: "地方中核市・県内都市",
    shortLabel: "地方中核",
    rosenkaPerSqm: 15000,
    marketPerSqm: 19000,
    rentPerSqm: 700,
    minRentWan: 3.5,
    market:
      "県内では生活利便性がある都市の目安。一定の賃貸需要が見込めるが、築古戸建ては競合・空室に注意。",
  },
  pref_capital: {
    label: "県庁所在地・都市部",
    shortLabel: "都市部",
    rosenkaPerSqm: 35000,
    marketPerSqm: 45000,
    rentPerSqm: 900,
    minRentWan: 5,
    market:
      "県都・政令市などの目安。賃貸需要は相対的に安定しやすいが、仕入れ価格も上がりやすい。古民家はリノベで差別化が重要。",
  },
};

/** 県庁所在地・政令市など（全国） */
const URBAN_CITY_KEYWORDS = [
  "札幌", "仙台", "さいたま", "千葉", "横浜", "川崎", "相模原", "東京", "新宿", "渋谷",
  "名古屋", "静岡", "浜松", "大阪", "堺", "神戸", "京都", "奈良", "和歌山",
  "広島", "岡山", "北九州", "福岡", "熊本", "鹿児島", "那覇",
  "新潟", "長野", "岐阜", "津", "大津", "奈良市", "和歌山市",
  "鳥取", "松江", "高松", "松山", "高知",
  "宮崎", "宮崎市", "鹿屋", "都城", "延岡", "長崎", "佐世保",
  "宇都宮", "前橋", "水戸", "甲府", "富山", "金沢", "福井", "徳島",
];

/** 過疎寄りとみなすキーワード */
const DEPOPULATED_KEYWORDS = ["村", "山間", "集落", "奥", "離島"];

export function detectAreaTier(location: string): AreaTierId {
  const loc = location.trim();
  if (!loc) return "rural";

  if (DEPOPULATED_KEYWORDS.some((k) => loc.includes(k))) return "depopulated";
  if (/町$|町[^市]|郡/.test(loc) && !loc.includes("市")) return "depopulated";

  if (URBAN_CITY_KEYWORDS.some((k) => loc.includes(k))) {
    if (
      /東京|大阪|名古屋|横浜|札幌|福岡|神戸|京都|川崎|広島|仙台/.test(loc)
    ) {
      return "pref_capital";
    }
    return "regional";
  }

  if (loc.includes("市")) return "regional";

  return "rural";
}

export type PropertyAnalysisInput = {
  location: string;
  price: string;
  area: string;
  landArea: string;
  builtYear: string;
  tierId?: AreaTierId;
};

export type PropertyAnalysis = {
  areaTierId: AreaTierId;
  areaTierLabel: string;
  tierAutoDetected: boolean;
  routekaEstimate: string;
  routekaPerSqm: number;
  landValueEstimate: string;
  landValueWan: number;
  buildingValueEstimate: string;
  buildingValueWan: number;
  totalValueWan: number;
  priceJudgment: string;
  recommendedRent: string;
  recommendedRentWan: number;
  grossYield: number;
  netYield: number;
  paybackYears: number;
  areaMarket: string;
  strengths: string[];
  risks: string[];
  overallScore: number;
  overallComment: string;
};

function parseLandSqm(landAreaStr: string): number {
  const sqmMatch = landAreaStr.match(/([0-9.]+)\s*[㎡m²]/);
  const tsuboMatch = landAreaStr.match(/([0-9.]+)\s*坪/);
  if (sqmMatch) return parseFloat(sqmMatch[1]);
  if (tsuboMatch) return parseFloat(tsuboMatch[1]) * 3.306;
  return 0;
}

function parseBuildSqm(areaStr: string): number {
  const bsqmMatch = areaStr.match(/([0-9.]+)\s*[㎡m²]/);
  const btsuboMatch = areaStr.match(/([0-9.]+)\s*坪/);
  if (bsqmMatch) return parseFloat(bsqmMatch[1]);
  if (btsuboMatch) return parseFloat(btsuboMatch[1]) * 3.306;
  return 0;
}

function parseAgeYears(builtStr: string): number {
  const ageMatch = builtStr.match(/築\s*([0-9]+)\s*年/);
  const yearMatch = builtStr.match(/([0-9]{4})\s*年/);
  if (ageMatch) return parseInt(ageMatch[1], 10);
  if (yearMatch) return 2026 - parseInt(yearMatch[1], 10);
  return 40;
}

function parsePriceWan(priceStr: string): number {
  if (/^(0|無償|無料|格安)$/i.test(priceStr.trim())) return 0;
  const priceWanMatch = priceStr.match(/([0-9,，]+)\s*万円/);
  if (priceWanMatch) return parseFloat(priceWanMatch[1].replace(/[,，]/g, ""));
  return 0;
}

export function analyzePropertyFinancials(input: PropertyAnalysisInput): PropertyAnalysis {
  const loc = input.location || "";
  const autoTier = detectAreaTier(loc);
  const tierId = input.tierId ?? autoTier;
  const tier = AREA_TIERS[tierId];
  const tierAutoDetected = !input.tierId || input.tierId === autoTier;

  const rosenka = tier.rosenkaPerSqm;
  const market = tier.marketPerSqm;

  const landSqm = parseLandSqm(input.landArea || "");
  const buildSqm = parseBuildSqm(input.area || "");
  const ageYears = parseAgeYears(input.builtYear || "");
  const priceMansoku = parsePriceWan(input.price || "");

  const landValueWan = landSqm > 0 ? Math.round((landSqm * market) / 10000) : 0;
  const landValueEstimate =
    landSqm > 0
      ? `【${tier.shortLabel}の目安】実勢 ${market.toLocaleString()}円/㎡ × ${Math.round(landSqm)}㎡ ≒ ${landValueWan}万円`
      : "土地面積が未入力のため計算できません";

  const depRate = Math.max(0, 1 - ageYears / 22);
  const newBuildCostPerTsubo = 180000;
  const buildTsubo = buildSqm > 0 ? buildSqm / 3.306 : 0;
  const buildingValueWan =
    buildTsubo > 0 ? Math.round((buildTsubo * newBuildCostPerTsubo * depRate) / 10000) : 0;
  const buildingValueEstimate =
    buildSqm > 0
      ? `新築坪単価18万円 × ${buildTsubo.toFixed(1)}坪（${Math.round(buildSqm)}㎡）× 残価率${Math.round(depRate * 100)}%（築${ageYears}年）≒ ${buildingValueWan}万円`
      : "建物面積が未入力のため計算できません";

  const totalValueWan = landValueWan + buildingValueWan;

  let priceJudgment = "価格不明のため比較できません";
  if (priceMansoku === 0 && totalValueWan > 0) {
    priceJudgment = `無償譲渡 → 適正${totalValueWan}万円に対して超割安（概算）`;
  } else if (priceMansoku > 0 && totalValueWan > 0) {
    const ratio = priceMansoku / totalValueWan;
    if (ratio < 0.5) priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → 割安（約${Math.round(ratio * 100)}%）`;
    else if (ratio < 0.9) priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → やや割安`;
    else if (ratio < 1.1) priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → 相場通り（概算）`;
    else priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → 割高（要交渉）`;
  }

  const rawRentWan =
    buildSqm > 0 ? Math.round((buildSqm * tier.rentPerSqm) / 10000 * 10) / 10 : 0;
  const recommendedRentWan = rawRentWan > 0 ? Math.max(rawRentWan, tier.minRentWan) : tier.minRentWan;
  const recommendedRent = `【${tier.label}の目安】約${tier.rentPerSqm}円/㎡ × 建物${Math.round(buildSqm) || "—"}㎡ → 月${recommendedRentWan}万円程度`;

  const basePriceWan = priceMansoku > 0 ? priceMansoku : totalValueWan;
  const annualRentWan = recommendedRentWan * 12;
  const grossYield =
    basePriceWan > 0 ? Math.round((annualRentWan / basePriceWan) * 1000) / 10 : 0;
  const netYield = Math.round(grossYield * 0.72 * 10) / 10;
  const paybackYears =
    recommendedRentWan > 0 ? Math.round((basePriceWan / annualRentWan) * 10) / 10 : 0;

  const strengths: string[] = [];
  const risks: string[] = [];

  if (priceMansoku === 0) strengths.push("無償譲渡で初期費用を大幅に抑えられる");
  if (priceMansoku > 0 && totalValueWan > 0 && priceMansoku < totalValueWan * 0.7) {
    strengths.push("概算適正価格より割安で取得できる可能性");
  }
  if (landSqm > 150) strengths.push(`広い敷地（${Math.round(landSqm)}㎡）`);
  if (grossYield >= 15) strengths.push(`表面利回り${grossYield}%（概算）`);
  if (tierId === "depopulated" || tierId === "rural") {
    strengths.push("低地価帯で固定資産税・仕入れが抑えやすい");
  }
  if (strengths.length < 2) strengths.push("地域特性に合わせた入居者設計で差別化できる");

  if (ageYears > 35) risks.push(`築${ageYears}年超。構造・設備の修繕計画が必要`);
  if (tierId === "depopulated") {
    risks.push("賃貸需要が限定的。入居者獲得に時間がかかることが多い");
  }
  if (tierId === "rural" || tierId === "depopulated") {
    risks.push("エリア区分は全国目安。正確な路線価は必ず国税庁で確認");
  }
  if (landSqm === 0 || buildSqm === 0) {
    risks.push("面積未入力のため試算精度が低い");
  }
  if (risks.length < 2) risks.push("空室・修繕費で収支が狂うリスクあり");

  let score = 5;
  if (grossYield >= 20) score += 2;
  else if (grossYield >= 10) score += 1;
  if (priceMansoku === 0) score += 1;
  if (ageYears > 50) score -= 1;
  if (landSqm > 200) score += 1;
  if (tierId === "depopulated") score -= 1;
  score = Math.max(1, Math.min(10, score));

  const overallComment = `【${tier.label}】${loc || "所在地未入力"}の概算です。${
    grossYield >= 15
      ? "利回りは高めの目安。"
      : grossYield >= 8
        ? "利回りは標準的な目安。"
        : "利回りは低め。改修費・家賃設定の見直しを。"
  }${ageYears > 40 ? "築年数が経っているため構造診断を推奨。" : ""}${
    tierAutoDetected ? "所在地から自動判定しました。違う場合は区分を変更して再計算してください。" : ""
  }`;

  const routekaEstimate = `【全国目安・${tier.shortLabel}】路線価 ${rosenka.toLocaleString()}円/㎡（実勢 ${market.toLocaleString()}円/㎡）※正確な値は国税庁で確認`;

  return {
    areaTierId: tierId,
    areaTierLabel: tier.label,
    tierAutoDetected,
    routekaEstimate,
    routekaPerSqm: rosenka,
    landValueEstimate,
    landValueWan,
    buildingValueEstimate,
    buildingValueWan,
    totalValueWan,
    priceJudgment,
    recommendedRent,
    recommendedRentWan,
    grossYield,
    netYield,
    paybackYears,
    areaMarket: tier.market,
    strengths,
    risks,
    overallScore: score,
    overallComment,
  };
}
