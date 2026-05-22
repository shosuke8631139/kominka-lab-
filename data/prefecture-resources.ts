/** 47都道府県の空き家・住宅政策への入口（リンク集。補助金額は各自治体で要確認） */

export type PrefectureRegion =
  | "北海道・東北"
  | "関東"
  | "中部"
  | "近畿"
  | "中国"
  | "四国"
  | "九州・沖縄";

export interface PrefectureResource {
  id: string;
  name: string;
  region: PrefectureRegion;
  /** 県庁・都庁の公式サイト */
  portalUrl: string;
  /** 空き家・住宅施策の案内（わかる場合のみ。なければ portalUrl を使用） */
  housingUrl?: string;
  note: string;
}

export const PREFECTURE_RESOURCES: PrefectureResource[] = [
  { id: "hokkaido", name: "北海道", region: "北海道・東北", portalUrl: "https://www.pref.hokkaido.lg.jp/", note: "市町村の空き家バンク・移住支援は各市町村ページから確認" },
  { id: "aomori", name: "青森県", region: "北海道・東北", portalUrl: "https://www.pref.aomori.lg.jp/", note: "県・市町村の住宅・空き家施策を検索" },
  { id: "iwate", name: "岩手県", region: "北海道・東北", portalUrl: "https://www.pref.iwate.jp/", note: "空き家バンク・移住支援は市町村ごとに異なる" },
  { id: "miyagi", name: "宮城県", region: "北海道・東北", portalUrl: "https://www.pref.miyagi.jp/", note: "仙台市など政令市は市のサイトも要確認" },
  { id: "akita", name: "秋田県", region: "北海道・東北", portalUrl: "https://www.pref.akita.lg.jp/", note: "空き家活用・移住の制度は年度で変わる" },
  { id: "yamagata", name: "山形県", region: "北海道・東北", portalUrl: "https://www.pref.yamagata.jp/", note: "市町村の空き家バンク登録が必要な場合あり" },
  { id: "fukushima", name: "福島県", region: "北海道・東北", portalUrl: "https://www.pref.fukushima.lg.jp/", note: "復興・移住・空き家制度を総合的に確認" },
  { id: "ibaraki", name: "茨城県", region: "関東", portalUrl: "https://www.pref.ibaraki.jp/", note: "県内市町村の空き家バンクへ個別登録" },
  { id: "tochigi", name: "栃木県", region: "関東", portalUrl: "https://www.pref.tochigi.lg.jp/", note: "宇都宮市などは市の住宅政策も確認" },
  { id: "gunma", name: "群馬県", region: "関東", portalUrl: "https://www.pref.gunma.jp/", note: "空き家・古民家の補助は市町村主体が多い" },
  { id: "saitama", name: "埼玉県", region: "関東", portalUrl: "https://www.pref.saitama.lg.jp/", note: "県の移住・住宅施策＋市町村の空き家バンク" },
  { id: "chiba", name: "千葉県", region: "関東", portalUrl: "https://www.pref.chiba.lg.jp/", note: "沿岸部・内陸で支援制度が異なる" },
  { id: "tokyo", name: "東京都", region: "関東", portalUrl: "https://www.metro.tokyo.lg.jp/", housingUrl: "https://www.tokyo-akiya.jp/", note: "都内空き家バンク・区市の施策も併せて確認" },
  { id: "kanagawa", name: "神奈川県", region: "関東", portalUrl: "https://www.pref.kanagawa.jp/", note: "横浜・川崎等は政令市のサイトを優先" },
  { id: "niigata", name: "新潟県", region: "中部", portalUrl: "https://www.pref.niigata.lg.jp/", note: "雪害・空き家除却の補助制度あり" },
  { id: "toyama", name: "富山県", region: "中部", portalUrl: "https://www.pref.toyama.jp/", note: "市町村の空き家バンクを確認" },
  { id: "ishikawa", name: "石川県", region: "中部", portalUrl: "https://www.pref.ishikawa.lg.jp/", note: "金沢市などは市の住宅ページも参照" },
  { id: "fukui", name: "福井県", region: "中部", portalUrl: "https://www.pref.fukui.lg.jp/", note: "移住・空き家活用の県独自制度あり" },
  { id: "yamanashi", name: "山梨県", region: "中部", portalUrl: "https://www.pref.yamanashi.jp/", note: "中山間・古民家の補助は要個別確認" },
  { id: "nagano", name: "長野県", region: "中部", portalUrl: "https://www.pref.nagano.lg.jp/", note: "空き家バンク・移住支援が充実している市町村あり" },
  { id: "gifu", name: "岐阜県", region: "中部", portalUrl: "https://www.pref.gifu.lg.jp/", note: "飛騨・岐阜市などエリアで制度差大" },
  { id: "shizuoka", name: "静岡県", region: "中部", portalUrl: "https://www.pref.shizuoka.lg.jp/", note: "浜松・静岡市は政令市サイトを確認" },
  { id: "aichi", name: "愛知県", region: "中部", portalUrl: "https://www.pref.aichi.jp/", note: "名古屋市は県・市の両方を確認" },
  { id: "mie", name: "三重県", region: "近畿", portalUrl: "https://www.pref.mie.lg.jp/", note: "伊勢・志摩など観光地は別制度あり" },
  { id: "shiga", name: "滋賀県", region: "近畿", portalUrl: "https://www.pref.shiga.lg.jp/", note: "琵琶湖周辺の空き家は市町村登録が必要" },
  { id: "kyoto", name: "京都府", region: "近畿", portalUrl: "https://www.pref.kyoto.jp/", note: "京都市の空き家・町家制度は市のサイト必須" },
  { id: "osaka", name: "大阪府", region: "近畿", portalUrl: "https://www.pref.osaka.lg.jp/", note: "大阪市・堺市はそれぞれの空き家施策を確認" },
  { id: "hyogo", name: "兵庫県", region: "近畿", portalUrl: "https://web.pref.hyogo.lg.jp/", note: "神戸・姫路などは市の住宅政策も参照" },
  { id: "nara", name: "奈良県", region: "近畿", portalUrl: "https://www.pref.nara.jp/", note: "中山間・古民家の補助は市町村主体" },
  { id: "wakayama", name: "和歌山県", region: "近畿", portalUrl: "https://www.pref.wakayama.lg.jp/", note: "紀州・山間部の空き家は要現地確認" },
  { id: "tottori", name: "鳥取県", region: "中国", portalUrl: "https://www.pref.tottori.lg.jp/", note: "人口減少地域の補助が手厚い市町村あり" },
  { id: "shimane", name: "島根県", region: "中国", portalUrl: "https://www.pref.shimane.lg.jp/", note: "空き家バンク・移住の窓口は市町村" },
  { id: "okayama", name: "岡山県", region: "中国", portalUrl: "https://www.pref.okayama.jp/", note: "県・市の住宅改修補助を確認" },
  { id: "hiroshima", name: "広島県", region: "中国", portalUrl: "https://www.pref.hiroshima.lg.jp/", note: "広島市は県と別に制度あり" },
  { id: "yamaguchi", name: "山口県", region: "中国", portalUrl: "https://www.pref.yamaguchi.lg.jp/", note: "離島・過疎地域は追加補助あり" },
  { id: "tokushima", name: "徳島県", region: "四国", portalUrl: "https://www.pref.tokushima.lg.jp/", note: "市町村の空き家バンク登録を確認" },
  { id: "kagawa", name: "香川県", region: "四国", portalUrl: "https://www.pref.kagawa.lg.jp/", note: "高松市などは市のサイトも参照" },
  { id: "ehime", name: "愛媛県", region: "四国", portalUrl: "https://www.pref.ehime.jp/", note: "松山市・今治市は個別に確認" },
  { id: "kochi", name: "高知県", region: "四国", portalUrl: "https://www.pref.kochi.lg.jp/", note: "移住・空き家活用の県独自制度あり" },
  { id: "fukuoka", name: "福岡県", region: "九州・沖縄", portalUrl: "https://www.pref.fukuoka.lg.jp/", note: "福岡市・北九州市は政令市サイト必須" },
  { id: "saga", name: "佐賀県", region: "九州・沖縄", portalUrl: "https://www.pref.saga.lg.jp/", note: "市町村の空き家バンクを確認" },
  { id: "nagasaki", name: "長崎県", region: "九州・沖縄", portalUrl: "https://www.pref.nagasaki.jp/", note: "離島は別途補助・移住制度あり" },
  { id: "kumamoto", name: "熊本県", region: "九州・沖縄", portalUrl: "https://www.pref.kumamoto.jp/", note: "熊本市・天草などエリア差あり" },
  { id: "oita", name: "大分県", region: "九州・沖縄", portalUrl: "https://www.pref.oita.jp/", note: "温泉地・山間部で制度が異なる" },
  { id: "miyazaki", name: "宮崎県", region: "九州・沖縄", portalUrl: "https://www.pref.miyazaki.lg.jp/", housingUrl: "https://www.pref.miyazaki.lg.jp/", note: "本ツールで市町村別の補助金目安あり（詳細タブ）" },
  { id: "kagoshima", name: "鹿児島県", region: "九州・沖縄", portalUrl: "https://www.pref.kagoshima.jp/", housingUrl: "https://www.pref.kagoshima.jp/", note: "本ツールで市町村別の補助金目安あり（詳細タブ）" },
  { id: "okinawa", name: "沖縄県", region: "九州・沖縄", portalUrl: "https://www.pref.okinawa.jp/", note: "離島・本島で支援内容が異なる" },
];

export const PREFECTURE_REGIONS: PrefectureRegion[] = [
  "北海道・東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州・沖縄",
];

export const AKIYA_VACANT_PORTAL_URL = "https://www.akiya-vacant.com/";
