"use client";

import { useState, useEffect } from "react";
import {
  KNOWLEDGE_ITEMS,
  INITIAL_TASKS,
  LEVEL_MAP,
  LEVEL_META,
  type KnowledgeItem,
  type LearningLevel,
} from "@/data/kominka-knowledge";
import {
  INSPECTION_ITEMS,
  INSPECTION_CATEGORIES,
  type CheckItem,
} from "@/data/inspection-checklist";
import {
  MUNICIPALITIES,
  NATIONAL_SUBSIDIES,
  type Prefecture,
} from "@/data/subsidies";

// 素人→プロの自然な流れ順
const STEPS = ["知識", "物件", "確認", "タスク", "メモ"] as const;
type Step = (typeof STEPS)[number];

interface Task {
  id: string;
  phase: string;
  text: string;
  done: boolean;
}

interface Memo {
  id: string;
  date: string;
  text: string;
}

const PLATFORMS = ["楽待", "アットホーム", "空き家バンク", "家いちば", "0円物件", "SUUMO", "その他"] as const;
const PROP_STATUSES = ["検討中", "内覧済", "候補★", "交渉中", "除外"] as const;

interface Property {
  id: string;
  name: string;
  location: string;
  price: string;
  area: string;
  landArea: string;
  builtYear: string;
  url: string;
  platform: string;
  propStatus: string;
  notes: string;
  addedAt: string;
}

const newProperty = (): Property => ({
  id: Date.now().toString(),
  name: "",
  location: "鹿屋市",
  price: "",
  area: "",
  landArea: "",
  builtYear: "",
  url: "",
  platform: "その他",
  propStatus: "検討中",
  notes: "",
  addedAt: new Date().toLocaleDateString("ja-JP"),
});

const PHASES = ["①事前準備", "②物件探し", "③内覧・調査", "④交渉・契約", "⑤残置物処理", "⑥改修・工事", "⑦入居者募集", "⑧入居後・次へ"];

export default function KominkaPage() {
  const [currentStep, setCurrentStep] = useState<Step>("知識");
  const [selectedLevel, setSelectedLevel] = useState<LearningLevel>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inspCategory, setInspCategory] = useState("持参するもの");
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [subsidyPref, setSubsidyPref] = useState<Prefecture>("鹿児島");
  const [subsidyCity, setSubsidyCity] = useState<string>("");
  const [showNational, setShowNational] = useState(false);
  const [showSim, setShowSim] = useState(false);
  const [parseResult, setParseResult] = useState<string | null>(null);
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);

  // ローカル物件分析（API不使用）
  type PropertyAnalysis = {
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
  const [analysisMap, setAnalysisMap] = useState<Record<string, PropertyAnalysis>>({});

  // エリア別路線価テーブル（知識ライブラリの公示地価データより）
  const LAND_PRICE_TABLE: { keywords: string[]; rosenkaPerSqm: number; marketPerSqm: number; label: string; market: string }[] = [
    { keywords: ["輝北", "串良", "大隅"], rosenkaPerSqm: 3500, marketPerSqm: 4200, label: "鹿屋市（山間部）", market: "人口流出が進む山間部。0円物件が多く最安クラス。入居者獲得にはSNS発信が必須。" },
    { keywords: ["鹿屋", "かのや", "吾平"], rosenkaPerSqm: 11000, marketPerSqm: 13700, label: "鹿屋市（市街地周辺）", market: "大隅半島の中核都市。住宅需要は限定的だが、自衛隊・病院関係者等の賃貸需要あり。DIY可物件は差別化になる。" },
    { keywords: ["南大隅", "根占", "佐多", "錦江"], rosenkaPerSqm: 2000, marketPerSqm: 2500, label: "南大隅町周辺", market: "大隅半島最南端。地価は九州最安クラス。移住者向け古民家再生の先進地でもある。" },
    { keywords: ["垂水", "曽於", "志布志", "肝付"], rosenkaPerSqm: 5000, marketPerSqm: 6200, label: "大隅半島（中部）", market: "農業・漁業が盛んな地域。賃貸需要は少ないが、農家民宿・農的暮らし希望者への訴求が有効。" },
    { keywords: ["霧島", "国分", "姶良", "加治木"], rosenkaPerSqm: 20000, marketPerSqm: 25000, label: "霧島・姶良エリア", market: "鹿児島市のベッドタウン。人口増加中で賃貸需要も安定。空き家再生でも入居者確保しやすい。" },
    { keywords: ["鹿児島市", "鹿児島", "郡山", "谷山", "坂之上"], rosenkaPerSqm: 40000, marketPerSqm: 50000, label: "鹿児島市（郊外）", market: "県都で需要が最も安定。郊外でも月3〜5万円の賃貸需要がある。リノベ物件は高値で貸せる。" },
    { keywords: ["天文館", "中央", "高見馬場", "武之橋"], rosenkaPerSqm: 300000, marketPerSqm: 400000, label: "鹿児島市（中心部）", market: "県内最高地価。古民家再生よりもテナント・マンション用途が中心。" },
    { keywords: ["都城", "三股"], rosenkaPerSqm: 15000, marketPerSqm: 19000, label: "都城市", market: "宮崎県南部の中核都市。鹿屋と隣接。賃貸需要は鹿屋より高めで安定。" },
    { keywords: ["高原", "小林", "えびの"], rosenkaPerSqm: 9000, marketPerSqm: 11000, label: "宮崎（山間部）", market: "霧島山系近くの自然豊かな地域。移住希望者向け古民家の需要が高まっている。" },
    { keywords: ["宮崎市", "宮崎"], rosenkaPerSqm: 45000, marketPerSqm: 56000, label: "宮崎市", market: "宮崎県の中心都市。地価は上昇傾向（+3.9%）。移住者・テレワーカーの流入が多い。" },
    { keywords: ["延岡", "日向", "日南", "串間", "高鍋", "国富"], rosenkaPerSqm: 22000, marketPerSqm: 27000, label: "宮崎（地方都市）", market: "宮崎県内の地方都市。工場・港湾関連の雇用があり一定の賃貸需要がある。" },
  ];

  const analyzeProperty = (prop: Property) => {

    // エリアマッチング
    const loc = prop.location || "";
    let areaInfo = LAND_PRICE_TABLE.find(a => a.keywords.some(k => loc.includes(k)));
    if (!areaInfo) {
      // フォールバック: 鹿屋市デフォルト
      areaInfo = LAND_PRICE_TABLE[1];
    }

    const rosenka = areaInfo.rosenkaPerSqm;
    const market = areaInfo.marketPerSqm;

    // 土地面積パース（例: "200㎡", "200m2", "60坪"）
    const landAreaStr = prop.landArea || "";
    let landSqm = 0;
    const sqmMatch = landAreaStr.match(/([0-9.]+)\s*[㎡m²]/);
    const tsuboMatch = landAreaStr.match(/([0-9.]+)\s*坪/);
    if (sqmMatch) landSqm = parseFloat(sqmMatch[1]);
    else if (tsuboMatch) landSqm = parseFloat(tsuboMatch[1]) * 3.306;

    // 建物面積パース
    const areaStr = prop.area || "";
    let buildSqm = 0;
    const bsqmMatch = areaStr.match(/([0-9.]+)\s*[㎡m²]/);
    const btsuboMatch = areaStr.match(/([0-9.]+)\s*坪/);
    if (bsqmMatch) buildSqm = parseFloat(bsqmMatch[1]);
    else if (btsuboMatch) buildSqm = parseFloat(btsuboMatch[1]) * 3.306;

    // 築年数パース
    const builtStr = prop.builtYear || "";
    let ageYears = 40; // デフォルト40年
    const ageMatch = builtStr.match(/築\s*([0-9]+)\s*年/);
    const yearMatch = builtStr.match(/([0-9]{4})\s*年/);
    if (ageMatch) ageYears = parseInt(ageMatch[1]);
    else if (yearMatch) ageYears = 2026 - parseInt(yearMatch[1]);

    // 価格パース（万円）
    const priceStr = prop.price || "";
    let priceMansoku = 0;
    const priceWanMatch = priceStr.match(/([0-9,，]+)\s*万円/);
    const priceZeroMatch = priceStr.match(/^(0|無償|無料|格安)$/i);
    if (priceZeroMatch) priceMansoku = 0;
    else if (priceWanMatch) priceMansoku = parseFloat(priceWanMatch[1].replace(/[,，]/g, ""));

    // 土地価値計算
    const landValueWan = landSqm > 0 ? Math.round((landSqm * market) / 10000) : 0;
    const landValueEstimate = landSqm > 0
      ? `${loc}付近の実勢価格 ${market.toLocaleString()}円/㎡ × ${Math.round(landSqm)}㎡ ≒ ${landValueWan}万円`
      : "土地面積が未入力のため計算できません";

    // 建物価値計算（木造: 法定耐用年数22年、残価率考慮）
    const depRate = Math.max(0, 1 - ageYears / 22);
    const newBuildCostPerSqm = 180000; // 万円/㎡の新築単価（木造）
    const buildingValueWan = buildSqm > 0
      ? Math.round((buildSqm * newBuildCostPerSqm * depRate) / 10000)
      : 0;
    const buildingValueEstimate = buildSqm > 0
      ? `新築坪単価18万円 × ${Math.round(buildSqm)}㎡ × 残価率${Math.round(depRate * 100)}%（築${ageYears}年）≒ ${buildingValueWan}万円`
      : "建物面積が未入力のため計算できません";

    const totalValueWan = landValueWan + buildingValueWan;

    // 売出価格との比較
    let priceJudgment = "価格不明のため比較できません";
    if (priceMansoku === 0 && totalValueWan > 0) priceJudgment = `無償譲渡 → 適正価格${totalValueWan}万円に対して超割安`;
    else if (priceMansoku > 0 && totalValueWan > 0) {
      const ratio = priceMansoku / totalValueWan;
      if (ratio < 0.5) priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → 割安（約${Math.round(ratio * 100)}%）`;
      else if (ratio < 0.9) priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → やや割安`;
      else if (ratio < 1.1) priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → 相場通り`;
      else priceJudgment = `売出${priceMansoku}万円 vs 適正${totalValueWan}万円 → 割高（要交渉）`;
    }

    // 推奨賃料（エリア相場 × 建物面積ベース）
    const rentPerSqm = rosenka < 5000 ? 300 : rosenka < 15000 ? 500 : rosenka < 40000 ? 800 : 1200;
    const rawRentWan = buildSqm > 0 ? Math.round(buildSqm * rentPerSqm / 10000 * 10) / 10 : 0;
    const recommendedRentWan = rawRentWan > 0 ? Math.max(rawRentWan, 2) : 3;
    const recommendedRent = `${areaInfo.label}の賃料相場（約${rentPerSqm}円/㎡）× 建物面積${Math.round(buildSqm)}㎡ = 月${recommendedRentWan}万円程度`;

    // 利回り計算（売出価格ベース、なければ適正価格ベース）
    const basePriceWan = priceMansoku > 0 ? priceMansoku : totalValueWan;
    const annualRentWan = recommendedRentWan * 12;
    const grossYield = basePriceWan > 0 ? Math.round(annualRentWan / basePriceWan * 1000) / 10 : 0;
    const netYield = Math.round(grossYield * 0.72 * 10) / 10; // 空室10%・経費20%
    const paybackYears = recommendedRentWan > 0 ? Math.round(basePriceWan / annualRentWan * 10) / 10 : 0;

    // 強み・リスク・スコア（エリアと築年数ベース）
    const strengths: string[] = [];
    const risks: string[] = [];

    if (priceMansoku === 0) strengths.push("無償譲渡で初期費用を大幅に抑えられる");
    if (priceMansoku > 0 && totalValueWan > 0 && priceMansoku < totalValueWan * 0.7) strengths.push("適正価格より割安で取得できる");
    if (landSqm > 150) strengths.push(`広い敷地（${Math.round(landSqm)}㎡）で駐車場・庭の余裕がある`);
    if (grossYield >= 15) strengths.push(`表面利回り${grossYield}%と高水準`);
    if (rosenka < 10000) strengths.push("低地価エリアで固定資産税が安い");
    if (strengths.length < 2) strengths.push("地方移住・テレワーク需要を取り込める立地");

    if (ageYears > 35) risks.push(`築${ageYears}年超のため構造・設備の大規模修繕が必要な可能性`);
    if (rosenka < 5000) risks.push("地価が低く、将来的な売却・資産価値回収が難しい");
    if (rosenka < 8000) risks.push("エリアの賃貸需要が限定的。入居者獲得にSNS発信が必須");
    if (landSqm === 0 || buildSqm === 0) risks.push("面積情報が未入力のため正確な計算ができていません");
    if (risks.length < 2) risks.push("空室期間が長引くと収益計画が狂う可能性がある");

    let score = 5;
    if (grossYield >= 20) score += 2;
    else if (grossYield >= 10) score += 1;
    if (priceMansoku === 0) score += 1;
    if (ageYears > 50) score -= 1;
    if (landSqm > 200) score += 1;
    if (rosenka < 5000) score -= 1;
    score = Math.max(1, Math.min(10, score));

    const overallComment = `${areaInfo.label}エリアの物件です。${
      grossYield >= 15 ? "利回りは高水準で収益性は良好。" :
      grossYield >= 8 ? "利回りは標準的。" : "利回りは低め。改修費と家賃設定の見直しを。"
    }${ageYears > 40 ? "築年数が経っているため、事前の構造診断を強くおすすめします。" : ""}`;

    const analysis: PropertyAnalysis = {
      routekaEstimate: `${areaInfo.label} 路線価目安 ${rosenka.toLocaleString()}円/㎡（実勢 ${market.toLocaleString()}円/㎡）`,
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
      areaMarket: areaInfo.market,
      strengths,
      risks,
      overallScore: score,
      overallComment,
    };

    setAnalysisMap(prev => ({ ...prev, [prop.id]: analysis }));
  };

  const fetchProperty = async (propId: string) => {
    if (!fetchUrl.trim().startsWith("http")) {
      setParseResult("正しいURL（http〜）を入力してください");
      return;
    }
    setFetchLoading(true);
    setParseResult(null);
    try {
      const res = await fetch("/api/fetch-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fetchUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setParseResult(`⚠️ ${data.error}`);
        return;
      }
      const updates = data.parsed as Partial<Property>;
      const filled = Object.keys(updates).filter(k => updates[k as keyof Property]);
      if (filled.length === 0) {
        setParseResult("情報を読み取れませんでした。手入力してください。");
        return;
      }
      updateProperty(propId, updates);
      const labelMap: Record<string, string> = {name:"物件名",location:"所在地",price:"価格",area:"建物面積",landArea:"土地面積",builtYear:"築年",url:"URL",platform:"サイト",notes:"メモ"};
      setParseResult(`✓ ${filled.length}項目読み取り（${filled.map(k => labelMap[k]||k).join("・")}）`);
      setFetchUrl("");
    } catch {
      setParseResult("⚠️ 通信エラーが発生しました");
    } finally {
      setFetchLoading(false);
    }
  };


  const [sim, setSim] = useState({
    purchase: "",
    renovation: "",
    subsidy: "",
    rent: "",
    years: "10",
  });

  useEffect(() => {
    const TASK_VERSION = "v2";
    const savedVersion = localStorage.getItem("kominka-tasks-version");
    const savedTasks = localStorage.getItem("kominka-tasks");
    const savedMemos = localStorage.getItem("kominka-memos");
    const savedProps = localStorage.getItem("kominka-properties");
    const savedChecked = localStorage.getItem("kominka-checked");
    if (savedTasks && savedVersion === TASK_VERSION) {
      setTasks(JSON.parse(savedTasks));
    } else {
      localStorage.setItem("kominka-tasks-version", TASK_VERSION);
      localStorage.removeItem("kominka-tasks");
    }
    if (savedMemos) setMemos(JSON.parse(savedMemos));
    if (savedProps) setProperties(JSON.parse(savedProps));
    if (savedChecked) setCheckedItems(JSON.parse(savedChecked));
  }, []);

  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem("kominka-tasks", JSON.stringify(updated));
  };

  const saveMemos = (updated: Memo[]) => {
    setMemos(updated);
    localStorage.setItem("kominka-memos", JSON.stringify(updated));
  };

  const saveProperties = (updated: Property[]) => {
    setProperties(updated);
    localStorage.setItem("kominka-properties", JSON.stringify(updated));
  };

  const updateProperty = (id: string, patch: Partial<Property>) => {
    saveProperties(properties.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const addNewProperty = () => {
    const p = newProperty();
    saveProperties([...properties, p]);
    setEditingPropId(p.id);
  };

  const deleteProperty = (id: string) => {
    if (!confirm("この物件を削除しますか？")) return;
    saveProperties(properties.filter(p => p.id !== id));
    if (editingPropId === id) setEditingPropId(null);
  };

  const toggleCheck = (id: string) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    localStorage.setItem("kominka-checked", JSON.stringify(updated));
  };

  const resetChecks = () => {
    setCheckedItems({});
    localStorage.removeItem("kominka-checked");
  };

  const toggleTask = (id: string) => {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      phase: "カスタム",
      text: newTaskText.trim(),
      done: false,
    };
    saveTasks([...tasks, task]);
    setNewTaskText("");
    setAddingTask(false);
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
  };

  const addMemo = () => {
    if (!newMemo.trim()) return;
    const memo: Memo = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("ja-JP"),
      text: newMemo.trim(),
    };
    saveMemos([memo, ...memos]);
    setNewMemo("");
  };

  const deleteMemo = (id: string) => {
    saveMemos(memos.filter((m) => m.id !== id));
  };

  const getItemLevel = (item: KnowledgeItem): LearningLevel => LEVEL_MAP[item.id] ?? 2;

  const filtered = KNOWLEDGE_ITEMS.filter((k) => {
    const matchesLevel = getItemLevel(k) === selectedLevel;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      k.title.toLowerCase().includes(q) ||
      k.summary.toLowerCase().includes(q) ||
      k.details.toLowerCase().includes(q);
    return matchesLevel && matchesSearch;
  });

  const levelCounts = ([1, 2, 3, 4] as LearningLevel[]).map(lv => ({
    lv,
    count: KNOWLEDGE_ITEMS.filter(k => getItemLevel(k) === lv).length,
  }));

  const allPhases = [...PHASES, ...(tasks.some((t) => t.phase === "カスタム") ? ["カスタム"] : [])];

  const doneCount = tasks.filter((t) => t.done).length;

  const simResult = (() => {
    const purchase = parseFloat(sim.purchase) || 0;
    const renovation = parseFloat(sim.renovation) || 0;
    const subsidy = parseFloat(sim.subsidy) || 0;
    const rent = parseFloat(sim.rent) || 0;
    const years = parseFloat(sim.years) || 10;
    if (rent <= 0) return null;
    const totalCost = purchase + renovation - subsidy;
    const totalRent = rent * 12 * years;
    const profit = totalRent - totalCost;
    const recoveryYears = totalCost > 0 ? totalCost / (rent * 12) : 0;
    const annualYield = totalCost > 0 ? ((rent * 12) / totalCost) * 100 : 0;
    const totalYield = totalCost > 0 ? (totalRent / totalCost) * 100 : 0;
    return { totalCost, totalRent, profit, recoveryYears, annualYield, totalYield, years };
  })();

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">🏚️ 古民家プロジェクト</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            タスク進捗: {doneCount} / {tasks.length}完了
          </p>
        </div>
      </header>

      {/* Tab navigation - 素人→プロの流れ順・横スクロール対応 */}
      <nav className="bg-white border-b border-gray-200 sticky top-[61px] z-10 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {STEPS.map((step, i) => {
            const STEP_META: Record<string, { icon: string; sub: string }> = {
              "知識":  { icon: "📖", sub: "学ぶ" },
              "物件":  { icon: "🏚️", sub: "探す" },
              "確認":  { icon: "✅", sub: "内覧" },
              "タスク":{ icon: "📋", sub: "進める" },
              "メモ":  { icon: "📝", sub: "記録" },
            };
            const meta = STEP_META[step] ?? { icon: "", sub: "" };
            const isActive = currentStep === step;
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`flex flex-col items-center px-4 py-2 border-b-2 transition-colors whitespace-nowrap min-w-[64px] ${
                  isActive
                    ? "border-[#8B7355] text-[#8B7355]"
                    : "border-transparent text-gray-400"
                }`}
              >
                <span className="text-base leading-none">{meta.icon}</span>
                <span className={`text-[11px] font-semibold mt-0.5 leading-none ${isActive ? "text-[#8B7355]" : "text-gray-500"}`}>{step}</span>
                <span className={`text-[9px] leading-none mt-0.5 ${isActive ? "text-[#8B7355]/70" : "text-gray-400"}`}>
                  {i + 1}. {meta.sub}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto pb-6">
        {/* ===== PANE 1: 知識ライブラリ ===== */}
        {currentStep === "知識" && (
          <div className="space-y-0">
            {/* ===== 学習レベルセレクター ===== */}
            <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 space-y-3 sticky top-[109px] z-[5]">
              {/* レベル進捗バー */}
              <div className="flex gap-1.5">
                {([1, 2, 3, 4] as LearningLevel[]).map((lv) => {
                  const meta = LEVEL_META[lv];
                  const isActive = selectedLevel === lv;
                  const colorMap: Record<string, string> = {
                    green: isActive ? "bg-green-500 text-white" : "bg-green-50 text-green-700",
                    blue:  isActive ? "bg-blue-500 text-white"  : "bg-blue-50 text-blue-700",
                    orange:isActive ? "bg-orange-500 text-white": "bg-orange-50 text-orange-700",
                    purple:isActive ? "bg-purple-500 text-white": "bg-purple-50 text-purple-700",
                  };
                  const cnt = levelCounts.find(c => c.lv === lv)?.count ?? 0;
                  return (
                    <button
                      key={lv}
                      onClick={() => { setSelectedLevel(lv); setExpandedId(null); setSearchQuery(""); }}
                      className={`flex-1 rounded-lg px-2 py-2 transition-colors text-center ${colorMap[meta.color]}`}
                    >
                      <p className="text-base leading-none">{meta.icon}</p>
                      <p className="text-[10px] font-bold mt-0.5 leading-none">{meta.label}</p>
                      <p className="text-[9px] opacity-70 leading-none mt-0.5">{cnt}記事</p>
                    </button>
                  );
                })}
              </div>

              {/* レベル説明 */}
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {LEVEL_META[selectedLevel].icon} <span className="font-semibold">{LEVEL_META[selectedLevel].label}</span>：{LEVEL_META[selectedLevel].description}
              </p>

              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="キーワードで検索（例：贈与税、残置物）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
              />
            </div>

            {/* ===== 記事カード一覧 ===== */}
            <div className="p-4 space-y-2">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">
                  該当する記事がありません
                </p>
              )}
              {filtered.map((item: KnowledgeItem, idx: number) => {
                const meta = LEVEL_META[getItemLevel(item)];
                const bgMap: Record<string, string> = { green: "bg-green-50 text-green-700", blue: "bg-blue-50 text-blue-700", orange: "bg-orange-50 text-orange-700", purple: "bg-purple-50 text-purple-700" };
                return (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bgMap[meta.color]}`}>
                              {meta.icon} {meta.label}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.category === "warn" ? "text-red-700 bg-red-50" : "text-[#8B7355] bg-[#F5F4F0]"}`}>
                              {item.categoryLabel}
                            </span>
                            <span className="text-[9px] text-gray-400">{idx + 1}/{filtered.length}</span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-gray-800">{item.title}</p>
                          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.summary}</p>
                        </div>
                        <span className="text-gray-400 text-sm mt-1 flex-shrink-0">
                          {expandedId === item.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>
                    {expandedId === item.id && (
                      <div className="border-t border-gray-100 p-4 space-y-3">
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{item.details}</p>
                        {item.tips && item.tips.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-1">💡 ポイント</p>
                            <ul className="space-y-1">
                              {item.tips.map((tip, i) => (
                                <li key={i} className="text-xs text-green-800 flex gap-1.5"><span>・</span><span>{tip}</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.warnings && item.warnings.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-700 mb-1">⚠️ 注意点</p>
                            <ul className="space-y-1">
                              {item.warnings.map((w, i) => (
                                <li key={i} className="text-xs text-red-700 flex gap-1.5"><span>・</span><span>{w}</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 次のレベルへ */}
              {filtered.length > 0 && selectedLevel < 4 && (
                <button
                  onClick={() => { setSelectedLevel((selectedLevel + 1) as LearningLevel); setExpandedId(null); setSearchQuery(""); window.scrollTo(0, 0); }}
                  className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-[#8B7355] to-[#a08a6a] text-white font-bold text-sm shadow"
                >
                  {LEVEL_META[(selectedLevel + 1) as LearningLevel].icon} Lv.{selectedLevel + 1}「{LEVEL_META[(selectedLevel + 1) as LearningLevel].label}」へ進む →
                </button>
              )}
              {filtered.length > 0 && selectedLevel === 4 && (
                <div className="mt-2 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 text-white text-center shadow">
                  <p className="text-lg">🎓</p>
                  <p className="font-bold text-sm">全レベル制覇！</p>
                  <p className="text-xs opacity-80 mt-1">次は「物件」タブで実際に動いてみましょう</p>
                </div>
              )}
            </div>

            {/* 補助金チェッカー（知識タブ内） */}
            <div className="border border-[#8B7355]/30 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowNational(n => !n)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#8B7355]/10 text-sm font-semibold text-[#8B7355]"
              >
                <span>🎁 補助金チェッカー</span>
                <span className="text-xs font-normal text-gray-500">{showNational ? "▲ 閉じる" : "▼ 開く"}</span>
              </button>
              {showNational && (
                <div className="p-4 space-y-4">
                  <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">※ 概要です。申請前に公式サイトで最新情報を必ず確認してください。</p>
                  <div className="flex gap-2">
                    {(["鹿児島", "宮崎"] as Prefecture[]).map(pref => (
                      <button key={pref} onClick={() => { setSubsidyPref(pref); setSubsidyCity(""); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${subsidyPref === pref ? "bg-[#8B7355] text-white border-[#8B7355]" : "bg-white text-gray-600 border-gray-300"}`}>
                        {pref}県
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {MUNICIPALITIES.filter(m => m.prefecture === subsidyPref).map(m => (
                      <button key={m.id} onClick={() => setSubsidyCity(subsidyCity === m.id ? "" : m.id)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${subsidyCity === m.id ? "bg-[#8B7355] text-white border-[#8B7355]" : "bg-white text-gray-600 border-gray-300"}`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  {subsidyCity && (() => {
                    const muni = MUNICIPALITIES.find(m => m.id === subsidyCity);
                    if (!muni) return null;
                    return (
                      <div className="space-y-3">
                        {muni.generalNote && <p className="text-[10px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2">🗾 {muni.generalNote}</p>}
                        <p className="text-xs font-bold text-gray-700">{muni.name}の補助金（{muni.subsidies.length}件）</p>
                        {muni.subsidies.map((s, i) => (
                          <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-gray-800 flex-1">{s.name}</p>
                              {s.maxWan !== null && <p className="text-base font-bold text-[#8B7355] flex-shrink-0">{s.maxWan}<span className="text-[10px] font-normal">万円</span></p>}
                            </div>
                            <p className="text-[10px] text-gray-500"><span className="font-bold">対象：</span>{s.target}</p>
                            <p className="text-[10px] text-gray-500"><span className="font-bold">条件：</span>{s.conditions}</p>
                            {s.note && <p className="text-[10px] text-amber-700">{s.note}</p>}
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] text-[#8B7355] underline">→ 公式サイト</a>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <details className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <summary className="px-4 py-3 text-xs font-bold text-gray-700 cursor-pointer">🏛️ 国の補助金（全国共通）</summary>
                    <div className="p-4 space-y-3">
                      {NATIONAL_SUBSIDIES.map((s, i) => (
                        <div key={i} className="space-y-1 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-gray-800 flex-1">{s.name}</p>
                            {s.maxWan !== null && <p className="text-sm font-bold text-[#8B7355] flex-shrink-0">{s.maxWan}<span className="text-[10px]">万円</span></p>}
                          </div>
                          <p className="text-[10px] text-gray-500">{s.target}</p>
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] text-[#8B7355] underline">→ 公式サイト</a>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PANE 2: 物件 ===== */}
        {currentStep === "物件" && (
          <div className="p-4 space-y-3">
            {/* ヘッダー */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">{properties.length}件登録済み</p>
              <div className="flex items-center gap-2">
                {properties.length >= 2 && (
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${compareMode ? "bg-[#8B7355] text-white border-[#8B7355]" : "bg-white text-[#8B7355] border-[#8B7355]"}`}
                  >
                    {compareMode ? "✕ 比較終了" : "⇄ 比較する"}
                  </button>
                )}
                <button
                  onClick={addNewProperty}
                  className="text-xs font-semibold text-white bg-[#8B7355] rounded-full px-4 py-1.5"
                >
                  ＋ 追加
                </button>
              </div>
            </div>

            {/* ===== 比較モード ===== */}
            {compareMode && properties.length >= 2 && (() => {
              const active = properties.filter(p => p.propStatus !== "除外");

              // 数値パーサ
              const parseWan = (s: string) => {
                if (!s) return null;
                if (/無償|0円|無料/.test(s)) return 0;
                const m = s.match(/([0-9,，]+)/);
                return m ? parseFloat(m[1].replace(/[,，]/g, "")) : null;
              };
              const parseSqm = (s: string) => {
                if (!s) return null;
                const m = s.match(/([0-9.]+)/);
                return m ? parseFloat(m[1]) : null;
              };

              // 各行の最良値インデックスを計算（nullは除く）
              const bestIdx = (vals: (number | null)[], higher: boolean) => {
                const valid = vals.map((v, i) => ({ v, i })).filter(x => x.v !== null) as { v: number; i: number }[];
                if (valid.length === 0) return -1;
                return higher
                  ? valid.reduce((a, b) => (b.v > a.v ? b : a)).i
                  : valid.reduce((a, b) => (b.v < a.v ? b : a)).i;
              };

              const prices = active.map(p => parseWan(p.price));
              const areas  = active.map(p => parseSqm(p.area));
              const lands  = active.map(p => parseSqm(p.landArea));
              const yields = active.map(p => analysisMap[p.id]?.grossYield ?? null);
              const netYields = active.map(p => analysisMap[p.id]?.netYield ?? null);
              const totalVals = active.map(p => analysisMap[p.id]?.totalValueWan ?? null);

              const priceBest  = bestIdx(prices, false);   // 安いほど良い
              const areaBest   = bestIdx(areas, true);
              const landBest   = bestIdx(lands, true);
              const yieldBest  = bestIdx(yields, true);
              const netBest    = bestIdx(netYields, true);
              const valBest    = bestIdx(totalVals, true);

              const statusColors: Record<string, string> = {
                "検討中": "bg-blue-100 text-blue-700",
                "内覧済": "bg-yellow-100 text-yellow-700",
                "候補★": "bg-green-100 text-green-700",
                "交渉中": "bg-orange-100 text-orange-700",
                "除外": "bg-gray-100 text-gray-400",
              };

              type RowDef = { label: string; vals: (string | null)[]; bestCol: number; higherIsBetter?: boolean };
              const rows: RowDef[] = [
                { label: "ステータス",    vals: active.map(p => p.propStatus), bestCol: -1 },
                { label: "価格",          vals: active.map((p, i) => prices[i] !== null ? (prices[i] === 0 ? "無償" : `${prices[i]}万円`) : p.price || "—"), bestCol: priceBest },
                { label: "建物面積",      vals: active.map((p, i) => areas[i] !== null ? `${areas[i]}㎡` : p.area || "—"), bestCol: areaBest, higherIsBetter: true },
                { label: "土地面積",      vals: active.map((p, i) => lands[i] !== null ? `${lands[i]}㎡` : p.landArea || "—"), bestCol: landBest, higherIsBetter: true },
                { label: "築年",          vals: active.map(p => p.builtYear || "—"), bestCol: -1 },
                { label: "表面利回り",    vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].grossYield.toFixed(1)}%` : "未計算"), bestCol: yieldBest, higherIsBetter: true },
                { label: "実質利回り",    vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].netYield.toFixed(1)}%` : "未計算"), bestCol: netBest, higherIsBetter: true },
                { label: "推定適正価格",  vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].totalValueWan}万円` : "未計算"), bestCol: valBest, higherIsBetter: true },
                { label: "路線価目安",    vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].routekaPerSqm.toLocaleString()}円/㎡` : "未計算"), bestCol: -1 },
                { label: "AI総評",        vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].overallScore}/10点` : "未計算"), bestCol: bestIdx(active.map(p => analysisMap[p.id]?.overallScore ?? null), true), higherIsBetter: true },
              ];

              return (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#F5F4F0]">
                          <th className="text-left px-3 py-2.5 text-gray-500 font-semibold sticky left-0 bg-[#F5F4F0] min-w-[80px] z-10">項目</th>
                          {active.map((p, i) => (
                            <th key={p.id} className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-[100px]">
                              <p className="truncate max-w-[100px]">{p.name || `物件${i + 1}`}</p>
                              <p className="font-normal text-[9px] text-gray-400 truncate max-w-[100px]">{p.location}</p>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className={`px-3 py-2.5 text-gray-500 font-medium sticky left-0 z-10 ${ri % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                              {row.label}
                            </td>
                            {active.map((p, ci) => {
                              const isBest = row.bestCol === ci;
                              const val = row.vals[ci];
                              if (row.label === "ステータス") {
                                return (
                                  <td key={p.id} className="px-3 py-2.5 text-center">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[val ?? ""] || "bg-gray-100 text-gray-500"}`}>
                                      {val}
                                    </span>
                                  </td>
                                );
                              }
                              return (
                                <td key={p.id} className="px-3 py-2.5 text-center">
                                  <span className={`font-semibold ${isBest ? "text-green-600" : "text-gray-700"}`}>
                                    {isBest && <span className="text-[9px] mr-0.5">★</span>}
                                    {val}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-3 py-2 bg-[#F5F4F0]">
                    <p className="text-[9px] text-gray-400">★ = その項目で最も優れた物件 ／ 「未計算」の物件は詳細を開いて「路線価・収支を計算」を押してください</p>
                  </div>
                </div>
              );
            })()}

            {/* 物件ゼロ状態 */}
            {properties.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-3">
                <p className="text-3xl">🏚️</p>
                <p className="text-sm text-gray-500">まだ物件が登録されていません</p>
                <p className="text-xs text-gray-400">楽待・アットホームで気になった物件を追加してみましょう</p>
                <button
                  onClick={addNewProperty}
                  className="mt-2 text-sm font-semibold text-white bg-[#8B7355] rounded-full px-6 py-2"
                >
                  ＋ 最初の物件を追加
                </button>
              </div>
            )}

            {/* 物件リスト */}
            {properties.map((prop) => {
              const isEditing = editingPropId === prop.id;
              const statusColors: Record<string, string> = {
                "検討中": "bg-blue-100 text-blue-700",
                "内覧済": "bg-yellow-100 text-yellow-700",
                "候補★": "bg-green-100 text-green-700",
                "交渉中": "bg-orange-100 text-orange-700",
                "除外": "bg-gray-100 text-gray-400",
              };
              return (
                <div key={prop.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${prop.propStatus === "除外" ? "opacity-50" : ""}`}>
                  {/* 一覧カード */}
                  <button
                    onClick={() => setEditingPropId(isEditing ? null : prop.id)}
                    className="w-full text-left px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[prop.propStatus] || "bg-gray-100 text-gray-500"}`}>
                            {prop.propStatus}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{prop.platform}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {prop.name || "（物件名未入力）"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {prop.location && <span className="text-xs text-gray-500">{prop.location}</span>}
                          {prop.price && <span className="text-xs font-medium text-[#8B7355]">{prop.price}</span>}
                          {(prop.area || prop.landArea) && (
                            <span className="text-xs text-gray-400">
                              {[prop.area, prop.landArea].filter(Boolean).join(" / ")}
                            </span>
                          )}
                          {prop.builtYear && <span className="text-xs text-gray-400">{prop.builtYear}</span>}
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm mt-1 flex-shrink-0">{isEditing ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* 詳細編集パネル */}
                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* URL取得 */}
                      <div className="bg-[#F5F4F0] rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-600">🔗 URLから自動入力</p>
                        <p className="text-[10px] text-gray-400">アットホーム・楽待等のURLを貼り付けるだけ</p>
                        <input
                          type="url"
                          value={fetchUrl}
                          onChange={(e) => setFetchUrl(e.target.value)}
                          placeholder="https://www.athome.co.jp/..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
                        />
                        <button
                          onClick={() => fetchProperty(prop.id)}
                          disabled={!fetchUrl.trim() || fetchLoading}
                          className="w-full bg-[#8B7355] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                        >
                          {fetchLoading ? "読み込み中…" : "情報を取得する"}
                        </button>
                        {parseResult && (
                          <p className={`text-xs text-center font-medium ${parseResult.startsWith("⚠") ? "text-red-500" : "text-green-600"}`}>
                            {parseResult}
                          </p>
                        )}
                        <details className="text-[10px] text-gray-400">
                          <summary className="cursor-pointer">うまく取得できない場合</summary>
                          <div className="mt-1 space-y-1">
                            <p>・サイトによっては取得できない場合があります</p>
                            <p>・その場合は下のフォームに手入力してください</p>
                          </div>
                        </details>
                      </div>

                      {/* ステータス・プラットフォーム */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">ステータス</label>
                          <select
                            value={prop.propStatus}
                            onChange={(e) => updateProperty(prop.id, { propStatus: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
                          >
                            {PROP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">サイト</label>
                          <select
                            value={prop.platform}
                            onChange={(e) => updateProperty(prop.id, { platform: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
                          >
                            {PLATFORMS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 基本情報 */}
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">物件名・通称</label>
                        <input type="text" value={prop.name}
                          onChange={(e) => updateProperty(prop.id, { name: e.target.value })}
                          placeholder="例：鹿屋の古民家A"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">所在地</label>
                        <input type="text" value={prop.location}
                          onChange={(e) => updateProperty(prop.id, { location: e.target.value })}
                          placeholder="例：鹿屋市〇〇町"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">価格・条件</label>
                          <input type="text" value={prop.price}
                            onChange={(e) => updateProperty(prop.id, { price: e.target.value })}
                            placeholder="例：0円"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">築年数</label>
                          <input type="text" value={prop.builtYear}
                            onChange={(e) => updateProperty(prop.id, { builtYear: e.target.value })}
                            placeholder="例：築50年"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">建物面積</label>
                          <input type="text" value={prop.area}
                            onChange={(e) => updateProperty(prop.id, { area: e.target.value })}
                            placeholder="例：80㎡"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">土地面積</label>
                          <input type="text" value={prop.landArea}
                            onChange={(e) => updateProperty(prop.id, { landArea: e.target.value })}
                            placeholder="例：200㎡"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">物件URL</label>
                        <input type="url" value={prop.url}
                          onChange={(e) => updateProperty(prop.id, { url: e.target.value })}
                          placeholder="https://..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                        {prop.url && (
                          <a href={prop.url} target="_blank" rel="noopener noreferrer"
                            className="inline-block mt-1 text-[10px] text-[#8B7355] underline">
                            → 物件ページを開く
                          </a>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">メモ・気づき</label>
                        <textarea value={prop.notes}
                          onChange={(e) => updateProperty(prop.id, { notes: e.target.value })}
                          placeholder="内覧で気づいたこと、懸念点など"
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355] resize-none" />
                      </div>

                      {/* 路線価・収支分析 */}
                      <div className="border border-[#8B7355]/30 rounded-lg overflow-hidden">
                        <button
                          onClick={() => analyzeProperty(prop)}
                          disabled={!prop.location}
                          className="w-full flex items-center justify-between px-4 py-3 bg-[#8B7355]/10 text-sm font-semibold text-[#8B7355] disabled:opacity-50"
                        >
                          <span>📊 路線価・収支を計算</span>
                          <span className="text-xs font-normal text-gray-500">タップで即時計算</span>
                        </button>

                        {analysisMap[prop.id] && (() => {
                          const a = analysisMap[prop.id];
                          const scoreColor = a.overallScore >= 7 ? "text-green-600" : a.overallScore >= 4 ? "text-amber-600" : "text-red-500";
                          return (
                            <div className="p-4 space-y-4">
                              {/* スコア */}
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-500">総合スコア</p>
                                  <p className={`text-3xl font-bold ${scoreColor}`}>{a.overallScore}<span className="text-sm font-normal">/10</span></p>
                                </div>
                                <p className="flex-1 text-xs text-gray-700 leading-relaxed">{a.overallComment}</p>
                              </div>

                              {/* 土地・建物価値 */}
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 mb-2">📍 土地・物件価値</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-[#F5F4F0] rounded-lg p-2.5">
                                    <p className="text-[9px] text-gray-500">推定路線価</p>
                                    <p className="text-sm font-bold text-gray-800">{a.routekaPerSqm ? `${a.routekaPerSqm.toLocaleString()}円/㎡` : "—"}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">{a.routekaEstimate}</p>
                                  </div>
                                  <div className="bg-[#F5F4F0] rounded-lg p-2.5">
                                    <p className="text-[9px] text-gray-500">推定適正価格</p>
                                    <p className="text-sm font-bold text-gray-800">{a.totalValueWan ? `${a.totalValueWan}万円` : "—"}</p>
                                    <p className={`text-[9px] mt-0.5 font-semibold ${a.priceJudgment?.includes("割安") ? "text-green-600" : a.priceJudgment?.includes("割高") ? "text-red-500" : "text-amber-600"}`}>
                                      {a.priceJudgment}
                                    </p>
                                  </div>
                                  <div className="bg-[#F5F4F0] rounded-lg p-2.5">
                                    <p className="text-[9px] text-gray-500">推定土地時価</p>
                                    <p className="text-sm font-bold text-gray-800">{a.landValueWan ? `${a.landValueWan}万円` : "—"}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-2">{a.landValueEstimate}</p>
                                  </div>
                                  <div className="bg-[#F5F4F0] rounded-lg p-2.5">
                                    <p className="text-[9px] text-gray-500">推定建物価値</p>
                                    <p className="text-sm font-bold text-gray-800">{a.buildingValueWan ? `${a.buildingValueWan}万円` : "—"}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-2">{a.buildingValueEstimate}</p>
                                  </div>
                                </div>
                              </div>

                              {/* 収益 */}
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 mb-2">💰 収益シミュレーション</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                                    <p className="text-[9px] text-gray-500">推奨賃料</p>
                                    <p className="text-sm font-bold text-green-700">{a.recommendedRentWan}万円<span className="text-[9px] font-normal">/月</span></p>
                                  </div>
                                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                                    <p className="text-[9px] text-gray-500">表面利回り</p>
                                    <p className="text-sm font-bold text-green-700">{a.grossYield?.toFixed(1)}%</p>
                                  </div>
                                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                                    <p className="text-[9px] text-gray-500">実質利回り</p>
                                    <p className="text-sm font-bold text-green-700">{a.netYield?.toFixed(1)}%</p>
                                  </div>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1.5">{a.recommendedRent}</p>
                                {a.paybackYears > 0 && (
                                  <p className="text-xs text-gray-600 mt-1">回収目安: <strong className="text-[#8B7355]">{a.paybackYears}年</strong></p>
                                )}
                              </div>

                              {/* エリア市場 */}
                              <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-blue-700 mb-1">🗾 エリア市場</p>
                                <p className="text-xs text-gray-700 leading-relaxed">{a.areaMarket}</p>
                              </div>

                              {/* 強み・リスク */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-green-50 rounded-lg p-3">
                                  <p className="text-[10px] font-bold text-green-700 mb-1.5">✅ 強み</p>
                                  {a.strengths?.map((s, i) => (
                                    <p key={i} className="text-[10px] text-gray-700 leading-relaxed">・{s}</p>
                                  ))}
                                </div>
                                <div className="bg-red-50 rounded-lg p-3">
                                  <p className="text-[10px] font-bold text-red-600 mb-1.5">⚠️ リスク</p>
                                  {a.risks?.map((r, i) => (
                                    <p key={i} className="text-[10px] text-gray-700 leading-relaxed">・{r}</p>
                                  ))}
                                </div>
                              </div>

                              <p className="text-[9px] text-gray-400 text-center">※ 公示地価・路線価データを基にした試算です。実際の投資判断は専門家に確認してください。</p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => deleteProperty(prop.id)}
                        className="w-full text-xs text-red-400 border border-red-200 rounded-lg py-2"
                      >
                        この物件を削除
                      </button>
                      <p className="text-[10px] text-gray-400 text-center">追加日: {prop.addedAt}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 収支シミュレーター（物件タブ内） */}
            <div className="border border-[#8B7355]/30 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSim(s => !s)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#8B7355]/10 text-sm font-semibold text-[#8B7355]"
              >
                <span>💰 収支シミュレーター</span>
                <span className="text-xs font-normal text-gray-500">{showSim ? "▲ 閉じる" : "▼ 開く"}</span>
              </button>
              {showSim && (
                <div className="p-4 space-y-4">
                  {properties.length > 0 && (
                    <div className="bg-white rounded-lg p-3 space-y-2">
                      <p className="text-[10px] font-bold text-gray-600">📋 物件から自動入力</p>
                      <select className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
                        defaultValue=""
                        onChange={(e) => {
                          const prop = properties.find(p => p.id === e.target.value);
                          if (!prop) return;
                          const ai = analysisMap[prop.id];
                          const priceNum = parseFloat(prop.price?.replace(/[^0-9.]/g, "") || "0") || 0;
                          const rentNum = ai?.recommendedRentWan || 0;
                          setSim(prev => ({
                            ...prev,
                            purchase: priceNum > 0 ? String(priceNum) : prev.purchase,
                            rent: rentNum > 0 ? String(rentNum) : prev.rent,
                          }));
                        }}>
                        <option value="">物件を選択…</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name || p.location || "未入力"}{p.price ? ` (${p.price})` : ""}{analysisMap[p.id] ? " ✓分析済" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-600">📥 コスト</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">仕入れ価格（万円）</label>
                        <input type="number" value={sim.purchase} onChange={(e) => setSim({ ...sim, purchase: e.target.value })} placeholder="例：0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">改修費（万円）</label>
                        <input type="number" value={sim.renovation} onChange={(e) => setSim({ ...sim, renovation: e.target.value })} placeholder="例：200" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">補助金（万円）</label>
                        <input type="number" value={sim.subsidy} onChange={(e) => setSim({ ...sim, subsidy: e.target.value })} placeholder="例：10" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-600 pt-1">📤 収入</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">月家賃（万円）</label>
                        <input type="number" value={sim.rent} onChange={(e) => setSim({ ...sim, rent: e.target.value })} placeholder="例：3" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">譲渡まで（年）</label>
                        <input type="number" value={sim.years} onChange={(e) => setSim({ ...sim, years: e.target.value })} placeholder="例：10" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]" />
                      </div>
                    </div>
                  </div>
                  {simResult ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#F5F4F0] rounded-lg p-3">
                          <p className="text-[10px] text-gray-500">実質投資額</p>
                          <p className="text-lg font-bold text-gray-800">{simResult.totalCost.toFixed(0)}<span className="text-xs font-normal ml-1">万円</span></p>
                        </div>
                        <div className="bg-[#F5F4F0] rounded-lg p-3">
                          <p className="text-[10px] text-gray-500">{simResult.years}年間の累計家賃</p>
                          <p className="text-lg font-bold text-gray-800">{simResult.totalRent.toFixed(0)}<span className="text-xs font-normal ml-1">万円</span></p>
                        </div>
                        <div className={`rounded-lg p-3 ${simResult.profit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                          <p className="text-[10px] text-gray-500">{simResult.years}年後の収益</p>
                          <p className={`text-lg font-bold ${simResult.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {simResult.profit >= 0 ? "+" : ""}{simResult.profit.toFixed(0)}<span className="text-xs font-normal ml-1">万円</span>
                          </p>
                        </div>
                        <div className="bg-[#F5F4F0] rounded-lg p-3">
                          <p className="text-[10px] text-gray-500">年利回り</p>
                          <p className="text-lg font-bold text-[#8B7355]">{simResult.annualYield.toFixed(1)}<span className="text-xs font-normal ml-1">%</span></p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 space-y-1">
                        <p className="text-xs text-gray-700">投資額 <strong>{simResult.totalCost.toFixed(0)}万円</strong> に対して月家賃 <strong>{sim.rent}万円</strong> で <strong className="text-[#8B7355]">約{simResult.recoveryYears.toFixed(1)}年</strong> で回収。</p>
                        <p className="text-xs text-gray-700">{simResult.years}年後の累計利回りは <strong className="text-[#8B7355]">{simResult.totalYield.toFixed(0)}%</strong>。{simResult.annualYield >= 15 ? " 高利回りです。" : simResult.annualYield >= 8 ? " 標準的な利回りです。" : " 利回りが低め。改修費・家賃設定を見直してみてください。"}</p>
                      </div>
                      <p className="text-[9px] text-gray-400 text-center">※ 空室期間・修繕費・税金は含まれていません</p>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-400 py-4">月家賃を入力すると計算結果が表示されます</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PANE 確認: 物件確認チェックリスト ===== */}
        {currentStep === "確認" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  現地を見るときにスマホで開いて使います。
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  チェック済み：{Object.values(checkedItems).filter(Boolean).length} / {INSPECTION_ITEMS.length}項目
                </p>
              </div>
              <button
                onClick={resetChecks}
                className="text-[10px] text-gray-400 border border-gray-300 rounded-full px-3 py-1"
              >
                リセット
              </button>
            </div>

            {/* カテゴリタブ（横スクロール） */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {INSPECTION_CATEGORIES.map((cat) => {
                const catItems = INSPECTION_ITEMS.filter((i) => i.category === cat);
                const catChecked = catItems.filter((i) => checkedItems[i.id]).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setInspCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium border transition-colors ${
                      inspCategory === cat
                        ? "bg-[#8B7355] text-white border-[#8B7355]"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {cat}
                    <span className={`ml-1 ${inspCategory === cat ? "text-white/70" : "text-gray-400"}`}>
                      {catChecked}/{catItems.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* チェックリスト */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {INSPECTION_ITEMS.filter((i) => i.category === inspCategory).map((item: CheckItem) => (
                <div
                  key={item.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    item.danger ? "bg-red-50/50" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleCheck(item.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        checkedItems[item.id]
                          ? "bg-[#8B7355] border-[#8B7355]"
                          : item.danger
                          ? "border-red-400"
                          : "border-gray-300"
                      }`}
                    >
                      {checkedItems[item.id] && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        {item.danger && (
                          <span className="text-[9px] text-red-500 font-bold bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0">
                            要注意
                          </span>
                        )}
                        <span
                          className={`text-sm leading-snug ${
                            checkedItems[item.id] ? "text-gray-400 line-through" : "text-gray-800"
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PANE 3: タスク・スケジュール ===== */}
        {currentStep === "タスク" && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                完了したものにチェックを入れてください。
              </p>
              <button
                onClick={() => setAddingTask(true)}
                className="text-xs text-[#8B7355] font-medium border border-[#8B7355] rounded-full px-3 py-1"
              >
                ＋ 追加
              </button>
            </div>
            {addingTask && (
              <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="タスクを入力..."
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    disabled={!newTaskText.trim()}
                    className="flex-1 bg-[#8B7355] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setAddingTask(false); setNewTaskText(""); }}
                    className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
            {allPhases.map((phase) => {
              const phaseTasks = tasks.filter((t) => t.phase === phase);
              if (phaseTasks.length === 0) return null;
              const phaseDone = phaseTasks.filter((t) => t.done).length;
              const phasePct = Math.round((phaseDone / phaseTasks.length) * 100);
              const allDone = phaseDone === phaseTasks.length;
              return (
                <div key={phase} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b border-gray-200 ${allDone ? "bg-green-50" : "bg-[#F5F4F0]"}`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm font-bold ${allDone ? "text-green-700" : "text-gray-700"}`}>
                        {allDone ? "✓ " : ""}{phase}
                      </span>
                      <span className="text-xs text-gray-500">
                        {phaseDone}/{phaseTasks.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${allDone ? "bg-green-500" : "bg-[#8B7355]"}`}
                        style={{ width: `${phasePct}%` }}
                      />
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {phaseTasks.map((task) => (
                      <li key={task.id} className="flex items-start">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex-1 flex items-start gap-3 px-4 py-3 text-left"
                        >
                          <span
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              task.done
                                ? "bg-[#8B7355] border-[#8B7355]"
                                : "border-gray-300"
                            }`}
                          >
                            {task.done && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </span>
                          <span
                            className={`text-sm leading-relaxed ${
                              task.done
                                ? "text-gray-400 line-through"
                                : "text-gray-700"
                            }`}
                          >
                            {task.text}
                          </span>
                        </button>
                        {task.phase === "カスタム" && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="pr-4 py-3 text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== PANE 4: 現場メモ ===== */}
        {currentStep === "メモ" && (
          <div className="p-4 space-y-4">
            <p className="text-xs text-gray-500">
              現場での気づき・思いついたことをメモしてください。
            </p>
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              <textarea
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="現場で気づいたこと、ふと思ったことを入力..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355] resize-none"
              />
              <button
                onClick={addMemo}
                disabled={!newMemo.trim()}
                className="w-full bg-[#8B7355] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                メモを保存
              </button>
            </div>
            {memos.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">
                まだメモがありません
              </p>
            ) : (
              <div className="space-y-2">
                {memos.map((memo) => (
                  <div
                    key={memo.id}
                    className="bg-white rounded-lg shadow-sm p-4 flex gap-3"
                  >
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-1">{memo.date}</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {memo.text}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMemo(memo.id)}
                      className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 mt-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
