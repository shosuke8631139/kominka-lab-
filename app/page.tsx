"use client";

import { useState, useEffect } from "react";
import {
  KNOWLEDGE_ITEMS,
  INITIAL_TASKS,
  LEVEL_MAP,
  LEVEL_META,
  CATEGORIES,
  getArticleScope,
  SCOPE_LABELS,
  type ArticleScope,
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
  NATIONAL_RESOURCE_LINKS,
  SUBSIDIES_DATA_AS_OF,
  type Prefecture,
} from "@/data/subsidies";
import {
  AKIYA_VACANT_PORTAL_URL,
  PREFECTURE_REGIONS,
  PREFECTURE_RESOURCES,
  type PrefectureRegion,
} from "@/data/prefecture-resources";
import {
  AREA_TIERS,
  ROSENKA_LOOKUP_URL,
  analyzePropertyFinancials,
  detectAreaTier,
  parsePriceWan,
  parsePriceWanOrNull,
  type AreaTierId,
  type PropertyAnalysis,
} from "@/lib/area-analysis";

const TASK_VERSION = "v2";
const EXPORT_VERSION = 2;
const GENERAL_CHECK_KEY = "__general__";
type CheckedByContext = Record<string, Record<string, boolean>>;

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
  propertyId?: string;
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
  location: "",
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
  const [checkedByContext, setCheckedByContext] = useState<CheckedByContext>({});
  const [inspectContextKey, setInspectContextKey] = useState(GENERAL_CHECK_KEY);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [articleScopeFilter, setArticleScopeFilter] = useState<"all" | ArticleScope>("all");
  const checkedItems = checkedByContext[inspectContextKey] ?? {};
  const [inspCategory, setInspCategory] = useState("持参するもの");
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [subsidyPref, setSubsidyPref] = useState<Prefecture>("鹿児島");
  const [subsidyCity, setSubsidyCity] = useState<string>("");
  const [showSubsidyPanel, setShowSubsidyPanel] = useState(false);
  const [subsidyMode, setSubsidyMode] = useState<"detail" | "national">("detail");
  const [prefRegionFilter, setPrefRegionFilter] = useState<PrefectureRegion | "all">("all");
  const [selectedPrefId, setSelectedPrefId] = useState("");
  const [prefSearch, setPrefSearch] = useState("");
  const [showSim, setShowSim] = useState(false);
  const [fetchDraftByProp, setFetchDraftByProp] = useState<Record<string, string>>({});
  const [fetchingPropId, setFetchingPropId] = useState<string | null>(null);
  const [parseResultByProp, setParseResultByProp] = useState<Record<string, string>>({});
  const [analysisMap, setAnalysisMap] = useState<Record<string, PropertyAnalysis>>({});
  const [areaTierByProp, setAreaTierByProp] = useState<Record<string, AreaTierId | "auto">>({});
  const [tasksResetNotice, setTasksResetNotice] = useState(false);
  const [newMemoPropertyId, setNewMemoPropertyId] = useState("");

  const persistAnalysis = (map: Record<string, PropertyAnalysis>) => {
    setAnalysisMap(map);
    localStorage.setItem("kominka-analysis", JSON.stringify(map));
  };

  const persistAreaTiers = (map: Record<string, AreaTierId | "auto">) => {
    setAreaTierByProp(map);
    localStorage.setItem("kominka-area-tiers", JSON.stringify(map));
  };

  const analyzeProperty = (prop: Property) => {
    const tierKey = areaTierByProp[prop.id] ?? "auto";
    const tierManual = tierKey !== "auto";
    const analysis = analyzePropertyFinancials({
      location: prop.location,
      price: prop.price,
      area: prop.area,
      landArea: prop.landArea,
      builtYear: prop.builtYear,
      tierId: tierManual ? tierKey : undefined,
      tierManual,
    });
    persistAnalysis({ ...analysisMap, [prop.id]: analysis });
  };

  const fetchProperty = async (propId: string) => {
    const prop = properties.find((p) => p.id === propId);
    const urlToFetch = (fetchDraftByProp[propId] ?? prop?.url ?? "").trim();
    if (!urlToFetch.startsWith("http")) {
      setParseResultByProp((prev) => ({
        ...prev,
        [propId]: "正しいURL（http〜）を入力してください",
      }));
      return;
    }
    setFetchingPropId(propId);
    setParseResultByProp((prev) => ({ ...prev, [propId]: "" }));
    try {
      const res = await fetch("/api/fetch-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToFetch }),
      });
      const data = await res.json();
      if (data.error) {
        setParseResultByProp((prev) => ({ ...prev, [propId]: `⚠️ ${data.error}` }));
        return;
      }
      const updates = data.parsed as Partial<Property>;
      const filled = Object.keys(updates).filter((k) => updates[k as keyof Property]);
      if (filled.length === 0) {
        setParseResultByProp((prev) => ({
          ...prev,
          [propId]: "情報を読み取れませんでした。手入力してください。",
        }));
        return;
      }
      updateProperty(propId, updates);
      const labelMap: Record<string, string> = {
        name: "物件名",
        location: "所在地",
        price: "価格",
        area: "建物面積",
        landArea: "土地面積",
        builtYear: "築年",
        url: "URL",
        platform: "サイト",
        notes: "メモ",
      };
      setParseResultByProp((prev) => ({
        ...prev,
        [propId]: `✓ ${filled.length}項目読み取り（${filled.map((k) => labelMap[k] || k).join("・")}）`,
      }));
      setFetchDraftByProp((prev) => ({ ...prev, [propId]: updates.url ?? urlToFetch }));
    } catch {
      setParseResultByProp((prev) => ({ ...prev, [propId]: "⚠️ 通信エラーが発生しました" }));
    } finally {
      setFetchingPropId(null);
    }
  };

  const exportAllData = () => {
    const payload = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      tasks,
      memos,
      properties,
      checkedByContext,
      analysisMap,
      areaTierByProp,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kominka-lab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importAllData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const data = JSON.parse(raw) as {
          tasks?: Task[];
          memos?: Memo[];
          properties?: Property[];
          checkedByContext?: CheckedByContext;
          checkedItems?: Record<string, boolean>;
          analysisMap?: Record<string, PropertyAnalysis>;
          areaTierByProp?: Record<string, AreaTierId | "auto">;
        };
        if (!confirm("バックアップで現在のデータを上書きします。よろしいですか？")) return;
        if (data.tasks?.length) saveTasks(data.tasks);
        if (data.memos) saveMemos(data.memos);
        if (data.properties) saveProperties(data.properties);
        if (data.checkedByContext) {
          setCheckedByContext(data.checkedByContext);
          localStorage.setItem("kominka-checked-v2", JSON.stringify(data.checkedByContext));
        } else if (data.checkedItems) {
          const migrated = { [GENERAL_CHECK_KEY]: data.checkedItems };
          setCheckedByContext(migrated);
          localStorage.setItem("kominka-checked-v2", JSON.stringify(migrated));
        }
        if (data.analysisMap) persistAnalysis(data.analysisMap);
        if (data.areaTierByProp) persistAreaTiers(data.areaTierByProp);
        alert("データを復元しました");
      } catch {
        alert("ファイルの読み込みに失敗しました");
      }
    };
    input.click();
  };


  const [sim, setSim] = useState({
    purchase: "",
    renovation: "",
    subsidy: "",
    rent: "",
    years: "10",
  });

  useEffect(() => {
    const savedVersion = localStorage.getItem("kominka-tasks-version");
    const savedTasks = localStorage.getItem("kominka-tasks");
    const savedMemos = localStorage.getItem("kominka-memos");
    const savedProps = localStorage.getItem("kominka-properties");
    const savedCheckedV2 = localStorage.getItem("kominka-checked-v2");
    const savedChecked = localStorage.getItem("kominka-checked");
    const savedAnalysis = localStorage.getItem("kominka-analysis");
    const savedTiers = localStorage.getItem("kominka-area-tiers");

    if (savedTasks && savedVersion === TASK_VERSION) {
      setTasks(JSON.parse(savedTasks));
    } else {
      if (savedTasks && savedVersion !== TASK_VERSION) setTasksResetNotice(true);
      localStorage.setItem("kominka-tasks-version", TASK_VERSION);
      localStorage.removeItem("kominka-tasks");
    }
    if (savedMemos) setMemos(JSON.parse(savedMemos));
    if (savedProps) setProperties(JSON.parse(savedProps));
    if (savedCheckedV2) {
      try {
        setCheckedByContext(JSON.parse(savedCheckedV2));
      } catch {
        localStorage.removeItem("kominka-checked-v2");
      }
    } else if (savedChecked) {
      try {
        setCheckedByContext({ [GENERAL_CHECK_KEY]: JSON.parse(savedChecked) });
      } catch {
        localStorage.removeItem("kominka-checked");
      }
    }
    if (savedAnalysis) {
      try {
        setAnalysisMap(JSON.parse(savedAnalysis));
      } catch {
        localStorage.removeItem("kominka-analysis");
      }
    }
    if (savedTiers) {
      try {
        setAreaTierByProp(JSON.parse(savedTiers));
      } catch {
        localStorage.removeItem("kominka-area-tiers");
      }
    }
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
    saveProperties(properties.filter((p) => p.id !== id));
    if (editingPropId === id) setEditingPropId(null);
    const nextAnalysis = { ...analysisMap };
    delete nextAnalysis[id];
    persistAnalysis(nextAnalysis);
    const nextTiers = { ...areaTierByProp };
    delete nextTiers[id];
    persistAreaTiers(nextTiers);
    setParseResultByProp((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFetchDraftByProp((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const persistChecked = (store: CheckedByContext) => {
    setCheckedByContext(store);
    localStorage.setItem("kominka-checked-v2", JSON.stringify(store));
  };

  const toggleCheck = (id: string) => {
    const ctx = inspectContextKey;
    const current = checkedByContext[ctx] ?? {};
    persistChecked({
      ...checkedByContext,
      [ctx]: { ...current, [id]: !current[id] },
    });
  };

  const resetChecks = () => {
    if (!confirm("この内覧コンテキストのチェックをすべてリセットしますか？")) return;
    const next = { ...checkedByContext };
    delete next[inspectContextKey];
    persistChecked(next);
  };

  const propertyLabel = (id: string) => {
    const p = properties.find((x) => x.id === id);
    return p?.name || p?.location || "（物件）";
  };

  const copyChecklistToClipboard = async () => {
    const lines = INSPECTION_ITEMS.map((item) => {
      const mark = checkedItems[item.id] ? "☑" : "□";
      const note = item.note ? `（${item.note}）` : "";
      return `${mark} [${item.category}] ${item.text}${note}`;
    });
    const header =
      inspectContextKey === GENERAL_CHECK_KEY
        ? "内覧チェックリスト"
        : `内覧チェック: ${propertyLabel(inspectContextKey.replace(/^prop-/, ""))}`;
    const text = `${header}\n${new Date().toLocaleDateString("ja-JP")}\n\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      alert("チェックリストをコピーしました（メモ帳等に貼り付けできます）");
    } catch {
      alert("コピーに失敗しました");
    }
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
      ...(newMemoPropertyId ? { propertyId: newMemoPropertyId } : {}),
    };
    saveMemos([memo, ...memos]);
    setNewMemo("");
    setNewMemoPropertyId("");
  };

  const deleteMemo = (id: string) => {
    saveMemos(memos.filter((m) => m.id !== id));
  };

  const getItemLevel = (item: KnowledgeItem): LearningLevel => LEVEL_MAP[item.id] ?? 2;

  const filtered = KNOWLEDGE_ITEMS.filter((k) => {
    const matchesLevel = getItemLevel(k) === selectedLevel;
    const matchesCategory =
      selectedCategory === "all" || k.category === selectedCategory;
    const scope = getArticleScope(k.id);
    const matchesScope =
      articleScopeFilter === "all" || scope === articleScopeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      k.title.toLowerCase().includes(q) ||
      k.summary.toLowerCase().includes(q) ||
      k.details.toLowerCase().includes(q);
    return matchesLevel && matchesCategory && matchesScope && matchesSearch;
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
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-800">🏚️ 古民家ラボ</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            タスク進捗: {doneCount} / {tasks.length}完了
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={exportAllData}
            className="text-[10px] px-2 py-1.5 rounded-lg border border-gray-300 text-gray-600"
            title="物件・タスク・分析結果をJSONで保存"
          >
            書出
          </button>
          <button
            type="button"
            onClick={importAllData}
            className="text-[10px] px-2 py-1.5 rounded-lg border border-gray-300 text-gray-600"
            title="バックアップJSONから復元"
          >
            読込
          </button>
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
            <p className="text-[10px] text-gray-500 bg-[#F5F4F0] px-4 py-2 leading-relaxed border-b border-gray-100">
              地価の詳細記事は鹿児島・宮崎中心。補助金は全国47都道府県の入口＋鹿児島・宮崎の市町村目安。収支試算は全国4区分の概算です。
            </p>
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

              <div className="flex gap-1.5 flex-wrap">
                {(["all", "national", "kagoshima-miyazaki"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => {
                      setArticleScopeFilter(scope);
                      setExpandedId(null);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-full border ${
                      articleScopeFilter === scope
                        ? "bg-[#8B7355] text-white border-[#8B7355]"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {scope === "all"
                      ? "すべて"
                      : scope === "national"
                        ? "全国向け"
                        : "鹿児島・宮崎"}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setExpandedId(null);
                    }}
                    className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? "bg-gray-700 text-white border-gray-700"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
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
                            {getArticleScope(item.id) === "kagoshima-miyazaki" && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                                {SCOPE_LABELS["kagoshima-miyazaki"]}
                              </span>
                            )}
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
                onClick={() => setShowSubsidyPanel((n) => !n)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#8B7355]/10 text-sm font-semibold text-[#8B7355]"
              >
                <span>🎁 補助金・制度チェッカー</span>
                <span className="text-xs font-normal text-gray-500">{showSubsidyPanel ? "▲ 閉じる" : "▼ 開く"}</span>
              </button>
              {showSubsidyPanel && (
                <div className="p-4 space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubsidyMode("detail");
                        setSelectedPrefId("");
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                        subsidyMode === "detail"
                          ? "bg-[#8B7355] text-white border-[#8B7355]"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      鹿児島・宮崎（詳細）
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubsidyMode("national");
                        setSubsidyCity("");
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                        subsidyMode === "national"
                          ? "bg-[#8B7355] text-white border-[#8B7355]"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      全国47都道府県
                    </button>
                  </div>

                  {subsidyMode === "national" ? (
                    <div className="space-y-3">
                      <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
                        都道府県ごとの公式入口です。補助金の上限額は市町村・年度で異なります。鹿児島・宮崎の目安額は「詳細」タブをご利用ください。
                      </p>
                      <a
                        href={AKIYA_VACANT_PORTAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs font-semibold text-[#8B7355] underline"
                      >
                        → 全国 空き家・空き地バンク（国交省）
                      </a>
                      <input
                        type="text"
                        value={prefSearch}
                        onChange={(e) => setPrefSearch(e.target.value)}
                        placeholder="都道府県名で検索"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setPrefRegionFilter("all")}
                          className={`text-[10px] px-2 py-1 rounded-full border ${
                            prefRegionFilter === "all"
                              ? "bg-gray-700 text-white border-gray-700"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          すべて
                        </button>
                        {PREFECTURE_REGIONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setPrefRegionFilter(r)}
                            className={`text-[10px] px-2 py-1 rounded-full border whitespace-nowrap ${
                              prefRegionFilter === r
                                ? "bg-gray-700 text-white border-gray-700"
                                : "bg-white border-gray-300"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {PREFECTURE_RESOURCES.filter((p) => {
                          const q = prefSearch.trim();
                          const matchRegion =
                            prefRegionFilter === "all" || p.region === prefRegionFilter;
                          const matchSearch = !q || p.name.includes(q);
                          return matchRegion && matchSearch;
                        }).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setSelectedPrefId(selectedPrefId === p.id ? "" : p.id)
                            }
                            className={`py-2 rounded-lg text-[10px] font-semibold border ${
                              selectedPrefId === p.id
                                ? "bg-[#8B7355] text-white border-[#8B7355]"
                                : "bg-white text-gray-600 border-gray-300"
                            }`}
                          >
                            {p.name.replace(/県|府|都$/, "")}
                          </button>
                        ))}
                      </div>
                      {selectedPrefId &&
                        (() => {
                          const pref = PREFECTURE_RESOURCES.find(
                            (p) => p.id === selectedPrefId
                          );
                          if (!pref) return null;
                          const housing = pref.housingUrl || pref.portalUrl;
                          return (
                            <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
                              <p className="text-sm font-bold text-gray-800">{pref.name}</p>
                              <p className="text-[10px] text-gray-600 leading-relaxed">{pref.note}</p>
                              <a
                                href={pref.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-[#8B7355] underline"
                              >
                                → {pref.name} 公式サイト
                              </a>
                              {housing !== pref.portalUrl && (
                                <a
                                  href={housing}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-[#8B7355] underline"
                                >
                                  → 住宅・空き家施策ページ
                                </a>
                              )}
                              {(pref.id === "kagoshima" || pref.id === "miyazaki") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubsidyMode("detail");
                                    setSubsidyPref(
                                      pref.id === "kagoshima" ? "鹿児島" : "宮崎"
                                    );
                                    setSubsidyCity("");
                                  }}
                                  className="text-xs font-semibold text-white bg-[#8B7355] rounded-lg py-2 w-full"
                                >
                                  市町村別の補助金目安を見る
                                </button>
                              )}
                            </div>
                          );
                        })()}
                    </div>
                  ) : (
                    <>
                  <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">※ 市町村別の概要です（鹿児島・宮崎・{SUBSIDIES_DATA_AS_OF}時点の目安）。上限額・要件は制度改廃で変わります。申請前に必ず各自治体の公式サイトで最新情報を確認してください。</p>
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
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-600 mb-2">🔗 全国の公式リンク</p>
                    <div className="space-y-2">
                      {NATIONAL_RESOURCE_LINKS.map((link) => (
                        <div key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#8B7355] underline"
                          >
                            {link.name}
                          </a>
                          <p className="text-[10px] text-gray-500 mt-0.5">{link.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                    </>
                  )}
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

              const parseWan = parsePriceWanOrNull;
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
                { label: "路線価目安（全国区分）", vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].routekaPerSqm.toLocaleString()}円/㎡` : "未計算"), bestCol: -1 },
                { label: "総合スコア",    vals: active.map(p => analysisMap[p.id] ? `${analysisMap[p.id].overallScore}/10点` : "未計算"), bestCol: bestIdx(active.map(p => analysisMap[p.id]?.overallScore ?? null), true), higherIsBetter: true },
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
                          value={fetchDraftByProp[prop.id] ?? prop.url ?? ""}
                          onChange={(e) =>
                            setFetchDraftByProp((prev) => ({ ...prev, [prop.id]: e.target.value }))
                          }
                          placeholder="https://www.athome.co.jp/..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
                        />
                        <button
                          onClick={() => fetchProperty(prop.id)}
                          disabled={
                            !(fetchDraftByProp[prop.id] ?? prop.url ?? "").trim() ||
                            fetchingPropId === prop.id
                          }
                          className="w-full bg-[#8B7355] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                        >
                          {fetchingPropId === prop.id ? "読み込み中…" : "情報を取得する"}
                        </button>
                        {parseResultByProp[prop.id] && (
                          <p
                            className={`text-xs text-center font-medium ${
                              parseResultByProp[prop.id].startsWith("⚠")
                                ? "text-red-500"
                                : "text-green-600"
                            }`}
                          >
                            {parseResultByProp[prop.id]}
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
                          placeholder="例：○○県○○市〇〇町"
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

                      {/* 路線価・収支分析（全国エリア区分） */}
                      <div className="border border-[#8B7355]/30 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-[#8B7355]/5 border-b border-[#8B7355]/20 space-y-2">
                          <label className="block text-[10px] font-semibold text-gray-500">
                            エリア区分（試算用・全国目安）
                          </label>
                          <select
                            value={areaTierByProp[prop.id] ?? "auto"}
                            onChange={(e) => {
                              const v = e.target.value as AreaTierId | "auto";
                              persistAreaTiers({ ...areaTierByProp, [prop.id]: v });
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B7355]"
                          >
                            <option value="auto">
                              自動（所在地から判定
                              {prop.location
                                ? ` → ${AREA_TIERS[detectAreaTier(prop.location)].shortLabel}`
                                : "・未入力時は地方農村"}
                              ）
                            </option>
                            {(Object.keys(AREA_TIERS) as AreaTierId[]).map((id) => (
                              <option key={id} value={id}>
                                {AREA_TIERS[id].label}
                              </option>
                            ))}
                          </select>
                          <p className="text-[9px] text-gray-400 leading-relaxed">
                            正確な路線価は
                            <a
                              href={ROSENKA_LOOKUP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#8B7355] underline mx-0.5"
                            >
                              国税庁 路線価図
                            </a>
                            で確認してください。ここでは4区分の概算のみ使います。
                          </p>
                        </div>
                        <button
                          onClick={() => analyzeProperty(prop)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-[#8B7355]/10 text-sm font-semibold text-[#8B7355]"
                        >
                          <span>📊 路線価・収支を計算</span>
                          <span className="text-xs font-normal text-gray-500">タップで即時計算</span>
                        </button>

                        {analysisMap[prop.id] && (() => {
                          const a = analysisMap[prop.id];
                          const scoreColor = a.overallScore >= 7 ? "text-green-600" : a.overallScore >= 4 ? "text-amber-600" : "text-red-500";
                          return (
                            <div className="p-4 space-y-4">
                              <p className="text-[10px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                エリア区分: <strong>{a.areaTierLabel}</strong>
                                {a.tierAutoDetected ? "（所在地から自動）" : "（手動選択）"}
                              </p>
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
                                    <p className="text-[9px] text-gray-500">土地時価（実勢目安）</p>
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

                              <p className="text-[9px] text-gray-400 text-center leading-relaxed">
                                ※ 全国4区分の概算試算です。正確な路線価は
                                <a href={ROSENKA_LOOKUP_URL} target="_blank" rel="noopener noreferrer" className="text-[#8B7355] underline">
                                  国税庁
                                </a>
                                で確認し、投資判断は専門家へご相談ください。
                              </p>
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
                          const priceNum = parsePriceWan(prop.price || "");
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
                        <label className="block text-[10px] text-gray-500 mb-1">運用期間（年）</label>
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
                      <p className="text-[9px] text-gray-400 text-center leading-relaxed">
                        ※ 空室・修繕費・税金は未反映。物件分析の「実質利回り」（経費28%控除）とは計算方法が異なります。
                      </p>
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
            <div className="bg-white rounded-lg p-3 space-y-2 shadow-sm">
              <label className="block text-[10px] font-semibold text-gray-500">
                内覧する物件（チェックを物件ごとに保存）
              </label>
              <select
                value={inspectContextKey}
                onChange={(e) => setInspectContextKey(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
              >
                <option value={GENERAL_CHECK_KEY}>共通（物件を指定しない）</option>
                {properties.map((p) => (
                  <option key={p.id} value={`prop-${p.id}`}>
                    {p.name || p.location || "未入力"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">
                  現地を見るときにスマホで開いて使います。
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  チェック済み：{Object.values(checkedItems).filter(Boolean).length} / {INSPECTION_ITEMS.length}項目
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={copyChecklistToClipboard}
                  className="text-[10px] text-[#8B7355] border border-[#8B7355]/40 rounded-full px-3 py-1"
                >
                  コピー
                </button>
                <button
                  onClick={resetChecks}
                  className="text-[10px] text-gray-400 border border-gray-300 rounded-full px-3 py-1"
                >
                  リセット
                </button>
              </div>
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
            {tasksResetNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                <p className="text-xs text-amber-800 leading-relaxed">
                  タスク一覧が更新されたため、保存されていたチェック状態はリセットされました（内容は最新版です）。
                </p>
                <button
                  type="button"
                  onClick={() => setTasksResetNotice(false)}
                  className="text-amber-600 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
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
              {properties.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                    関連物件（任意）
                  </label>
                  <select
                    value={newMemoPropertyId}
                    onChange={(e) => setNewMemoPropertyId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#8B7355] bg-white"
                  >
                    <option value="">紐づけなし</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.location || "未入力"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                      <p className="text-[10px] text-gray-400 mb-1">
                        {memo.date}
                        {memo.propertyId && (
                          <span className="ml-2 text-[#8B7355]">
                            🏚️ {propertyLabel(memo.propertyId)}
                          </span>
                        )}
                      </p>
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
