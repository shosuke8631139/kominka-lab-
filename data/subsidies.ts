export interface Subsidy {
  name: string;
  /** 上限額（万円）。nullは要確認 */
  maxWan: number | null;
  target: string;
  conditions: string;
  url: string;
  note?: string;
}

export interface Municipality {
  id: string;
  name: string;
  prefecture: "鹿児島" | "宮崎";
  subsidies: Subsidy[];
  generalNote?: string;
}

export const MUNICIPALITIES: Municipality[] = [
  // ===== 鹿児島県 =====
  {
    id: "kanoya",
    name: "鹿屋市",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家バンク活用改修補助金",
        maxWan: 100,
        target: "空き家バンク登録物件の改修工事費",
        conditions: "空き家バンクに登録された物件・市内施工業者を使用・改修後5年以上居住",
        url: "https://www.city.kanoya.lg.jp/",
        note: "補助率1/2以内。市税滞納なし。",
      },
      {
        name: "残置物撤去処理補助金",
        maxWan: 20,
        target: "空き家内の残置物の撤去・処分費用",
        conditions: "空き家バンク登録物件・市内業者を使用",
        url: "https://www.city.kanoya.lg.jp/",
        note: "補助率1/2以内。",
      },
      {
        name: "移住・定住促進補助金（U・Iターン）",
        maxWan: 50,
        target: "移住にかかる転居費用・住宅取得費の一部",
        conditions: "県外からの転入・市内に3年以上定住予定",
        url: "https://www.city.kanoya.lg.jp/",
      },
      {
        name: "木造住宅耐震改修補助",
        maxWan: 60,
        target: "耐震診断・耐震改修工事費",
        conditions: "昭和56年以前建築の木造住宅・耐震診断を受けた物件",
        url: "https://www.city.kanoya.lg.jp/",
        note: "補助率2/3以内。",
      },
    ],
    generalNote: "鹿屋市は大隅半島の中核都市。空き家バンク制度が充実しており、補助金と組み合わせて活用しやすい。詳細・最新情報は市の住宅政策課へ直接確認を。",
  },
  {
    id: "tarumizu",
    name: "垂水市",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家活用改修補助金",
        maxWan: 80,
        target: "空き家の改修工事費",
        conditions: "空き家バンク登録・改修後に居住または賃貸に供する",
        url: "https://www.city.tarumizu.lg.jp/",
        note: "補助率1/2以内。",
      },
      {
        name: "移住促進奨励金",
        maxWan: 30,
        target: "移住に伴う引越し費用等",
        conditions: "県外から転入・市内に2年以上定住",
        url: "https://www.city.tarumizu.lg.jp/",
      },
      {
        name: "木造住宅耐震改修補助",
        maxWan: 60,
        target: "耐震改修工事費",
        conditions: "旧耐震基準（昭和56年以前）の木造住宅",
        url: "https://www.city.tarumizu.lg.jp/",
      },
    ],
    generalNote: "桜島の対岸に位置する自然豊かなエリア。海沿いの古民家が格安で出ている場合がある。",
  },
  {
    id: "soo",
    name: "曽於市",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家改修支援補助金",
        maxWan: 100,
        target: "空き家バンク登録物件の改修費",
        conditions: "空き家バンク登録・市内業者使用・5年以上居住",
        url: "https://www.city.soo.kagoshima.jp/",
        note: "補助率1/2以内。",
      },
      {
        name: "残置物処理補助",
        maxWan: 15,
        target: "残置物撤去費用",
        conditions: "空き家バンク登録物件のみ",
        url: "https://www.city.soo.kagoshima.jp/",
      },
      {
        name: "子育て世帯移住補助金",
        maxWan: 100,
        target: "住宅取得・改修・引越し費用",
        conditions: "18歳未満の子を持つ世帯・県外からの転入・5年以上定住",
        url: "https://www.city.soo.kagoshima.jp/",
        note: "子育て世帯は上乗せあり。",
      },
    ],
    generalNote: "都城市（宮崎）と隣接。農地・大型古民家が安価に出るエリア。",
  },
  {
    id: "kimotsuki",
    name: "肝付町",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家活用支援事業補助金",
        maxWan: 80,
        target: "空き家の改修・整備費用",
        conditions: "空き家バンク登録物件・町内業者使用",
        url: "https://www.town.kimotsuki.kagoshima.jp/",
      },
      {
        name: "移住定住促進補助金",
        maxWan: 40,
        target: "移住にかかる費用全般",
        conditions: "県外からのUIターン・3年以上定住",
        url: "https://www.town.kimotsuki.kagoshima.jp/",
      },
    ],
    generalNote: "宇宙科学研究所（JAXA）がある町。移住者受け入れに積極的。",
  },
  {
    id: "minamiohsumi",
    name: "南大隅町",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家バンク改修補助金",
        maxWan: 100,
        target: "空き家の改修・修繕費",
        conditions: "空き家バンク登録・5年以上居住・町内業者使用",
        url: "https://www.town.minamiohsumi.lg.jp/",
        note: "大隅半島最南端。補助が手厚い傾向がある。",
      },
      {
        name: "移住応援補助金",
        maxWan: 50,
        target: "転居費・住宅改修費",
        conditions: "県外からの移住・3年以上定住",
        url: "https://www.town.minamiohsumi.lg.jp/",
      },
      {
        name: "空き家解体補助金",
        maxWan: 50,
        target: "老朽危険空き家の解体費用",
        conditions: "特定空き家等に認定・所有者申請",
        url: "https://www.town.minamiohsumi.lg.jp/",
        note: "解体後の土地活用も支援あり。",
      },
    ],
    generalNote: "地価が九州最安クラス。0円物件も多く、補助金と組み合わせれば初期費用を極限まで抑えられる。",
  },
  {
    id: "kirishima",
    name: "霧島市",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家活用支援補助金",
        maxWan: 100,
        target: "空き家の改修工事費",
        conditions: "空き家バンク登録物件・市内業者使用・5年以上居住",
        url: "https://www.city.kirishima.lg.jp/",
      },
      {
        name: "移住定住促進補助金",
        maxWan: 50,
        target: "転居費・住宅改修費",
        conditions: "県外からのUIターン",
        url: "https://www.city.kirishima.lg.jp/",
      },
      {
        name: "木造住宅耐震改修補助",
        maxWan: 80,
        target: "耐震診断・改修費",
        conditions: "旧耐震基準の木造住宅",
        url: "https://www.city.kirishima.lg.jp/",
        note: "補助率2/3以内。",
      },
    ],
    generalNote: "鹿児島市のベッドタウン。人口増加中で賃貸需要が高い。補助金制度も整備されている。",
  },
  {
    id: "aira",
    name: "姶良市",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家バンク活用補助金",
        maxWan: 80,
        target: "空き家の改修・修繕費",
        conditions: "空き家バンク登録・5年以上居住",
        url: "https://www.city.aira.lg.jp/",
      },
      {
        name: "移住促進補助金",
        maxWan: 30,
        target: "転居費用等",
        conditions: "県外からの転入",
        url: "https://www.city.aira.lg.jp/",
      },
    ],
    generalNote: "鹿児島市に隣接し人口増加中。賃貸需要が高く、空き家活用の収益性が出やすいエリア。",
  },
  {
    id: "kagoshima",
    name: "鹿児島市",
    prefecture: "鹿児島",
    subsidies: [
      {
        name: "空き家活用促進補助金",
        maxWan: 100,
        target: "空き家の改修工事費",
        conditions: "空き家バンク登録物件・市内業者使用",
        url: "https://www.city.kagoshima.lg.jp/",
      },
      {
        name: "木造住宅耐震改修補助",
        maxWan: 100,
        target: "耐震診断・耐震改修費",
        conditions: "旧耐震基準の木造住宅・耐震診断済",
        url: "https://www.city.kagoshima.lg.jp/",
        note: "補助率2/3以内。",
      },
      {
        name: "省エネ改修補助金",
        maxWan: 30,
        target: "断熱改修・窓交換・高効率給湯器設置",
        conditions: "市内の住宅・市内業者使用",
        url: "https://www.city.kagoshima.lg.jp/",
      },
    ],
    generalNote: "県都。地価は高いが補助金制度は充実。耐震・省エネ系補助との組み合わせが有効。",
  },

  // ===== 宮崎県 =====
  {
    id: "miyakonojo",
    name: "都城市",
    prefecture: "宮崎",
    subsidies: [
      {
        name: "空き家活用改修補助金",
        maxWan: 100,
        target: "空き家の改修工事費",
        conditions: "空き家バンク登録物件・市内業者使用・5年以上居住",
        url: "https://www.city.miyakonojo.miyazaki.jp/",
        note: "補助率1/2以内。",
      },
      {
        name: "残置物処理補助",
        maxWan: 20,
        target: "残置物の撤去・処分費",
        conditions: "空き家バンク登録物件",
        url: "https://www.city.miyakonojo.miyazaki.jp/",
      },
      {
        name: "移住定住促進奨励金",
        maxWan: 60,
        target: "住宅取得・改修・引越し費用",
        conditions: "県外からの転入・3年以上定住",
        url: "https://www.city.miyakonojo.miyazaki.jp/",
        note: "子育て世帯は上乗せあり。",
      },
      {
        name: "木造住宅耐震診断補助",
        maxWan: 5,
        target: "耐震診断費用",
        conditions: "昭和56年以前建築の木造住宅",
        url: "https://www.city.miyakonojo.miyazaki.jp/",
        note: "診断後の改修補助も別途あり。",
      },
    ],
    generalNote: "鹿屋市と隣接する宮崎県南部の中核都市。肉・焼酎の生産で有名。移住者受け入れに積極的。",
  },
  {
    id: "miyazaki",
    name: "宮崎市",
    prefecture: "宮崎",
    subsidies: [
      {
        name: "空き家活用支援補助金",
        maxWan: 100,
        target: "空き家の改修工事費",
        conditions: "空き家バンク登録・市内業者使用・5年以上居住",
        url: "https://www.city.miyazaki.miyazaki.jp/",
      },
      {
        name: "移住促進補助金（宮崎暮らし応援補助金）",
        maxWan: 100,
        target: "移住・定住にかかる費用",
        conditions: "東京圏等からの転入・テレワーク移住含む",
        url: "https://www.city.miyazaki.miyazaki.jp/",
        note: "テレワーク移住者への加算制度あり。",
      },
      {
        name: "省エネ・ZEH改修補助",
        maxWan: 50,
        target: "断熱・太陽光・蓄電池設置",
        conditions: "市内住宅・市内業者",
        url: "https://www.city.miyazaki.miyazaki.jp/",
      },
    ],
    generalNote: "宮崎県の中心都市。地価上昇中（+3.9%）だが補助金が充実。テレワーク移住者向け補助が手厚い。",
  },
  {
    id: "kobayashi",
    name: "小林市",
    prefecture: "宮崎",
    subsidies: [
      {
        name: "空き家バンク改修補助金",
        maxWan: 80,
        target: "空き家の改修費",
        conditions: "空き家バンク登録・市内業者使用・5年以上居住",
        url: "https://www.city.kobayashi.miyazaki.jp/",
      },
      {
        name: "移住者住宅取得補助金",
        maxWan: 60,
        target: "住宅取得・改修費",
        conditions: "県外からのIターン・市内に5年以上定住",
        url: "https://www.city.kobayashi.miyazaki.jp/",
        note: "えびの高原近く。自然環境目当ての移住者が多い。",
      },
    ],
    generalNote: "えびの高原・霧島に近い山間部。移住者増加中で補助金も整備されてきている。",
  },
  {
    id: "takaharu",
    name: "高原町",
    prefecture: "宮崎",
    subsidies: [
      {
        name: "空き家活用補助金",
        maxWan: 60,
        target: "空き家の改修費",
        conditions: "空き家バンク登録・町内業者使用",
        url: "https://www.town.takaharu.lg.jp/",
      },
      {
        name: "移住定住奨励金",
        maxWan: 30,
        target: "転居費・生活費補助",
        conditions: "県外からの転入・3年以上定住",
        url: "https://www.town.takaharu.lg.jp/",
      },
    ],
    generalNote: "地価が宮崎で最も安いエリア（約9,000円/㎡）。0円・格安物件が狙いやすい穴場。",
  },
];

/** 市町村補助金データの目安時点（制度は変わるため要公式確認） */
export const SUBSIDIES_DATA_AS_OF = "2026年5月";

/** 都道府県一覧 */
export const PREFECTURES = ["すべて", "鹿児島", "宮崎"] as const;
export type Prefecture = typeof PREFECTURES[number];

/** 国の主要補助金（全国共通） */
export const NATIONAL_SUBSIDIES: Subsidy[] = [
  {
    name: "こどもエコすまい支援事業（リフォーム）",
    maxWan: 60,
    target: "省エネ改修・バリアフリー改修費",
    conditions: "2000年以降着工の既存住宅・子育て世帯・若者夫婦世帯は上乗せ",
    url: "https://kodomo-ecosumai.mlit.go.jp/",
    note: "国土交通省の補助。年度ごとに予算切れの場合あり。",
  },
  {
    name: "長期優良住宅化リフォーム推進事業",
    maxWan: 250,
    target: "耐震・省エネ・劣化対策の改修費",
    conditions: "インスペクション（建物診断）実施が必須・登録施工業者による施工",
    url: "https://www.kenken.go.jp/chouki_r/",
    note: "補助率1/3。インスペクション費用も補助対象。",
  },
  {
    name: "住宅確保要配慮者専用賃貸住宅改修事業",
    maxWan: 200,
    target: "セーフティネット住宅としての改修費",
    conditions: "住宅確保要配慮者向け賃貸として登録・バリアフリー対応等",
    url: "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk4_000103.html",
    note: "高齢者・低所得者・外国人等を入居対象にする場合。",
  },
  {
    name: "空き家対策総合支援事業（地方公共団体経由）",
    maxWan: null,
    target: "空き家の除却・改修・利活用促進",
    conditions: "各市町村が実施主体。国が費用の一部を補助",
    url: "https://www.mlit.go.jp/jutakukentiku/house/akiya.html",
    note: "直接申請不可。市町村の補助金がこの制度を活用している場合が多い。",
  },
];
