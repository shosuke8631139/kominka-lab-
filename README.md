# 古民家ラボ（kominka-lab2）

古民家・空き家の学習、物件メモ、収支試算、内覧チェックリスト、タスク管理をひとつにまとめた Web ツールです。

**本番:** https://kominka-lab.netlify.app

## 機能

| タブ | 内容 |
|------|------|
| 知識 | Lv.1〜4 の記事、カテゴリ・地域フィルタ、補助金チェッカー（鹿児島・宮崎） |
| 物件 | 物件登録、URL 取得（対応サイトのみ）、全国4区分の収支概算、比較・シミュ |
| 確認 | 61 項目の内覧チェック（物件別に保存可） |
| タスク | 取得〜入居後まで 61 タスク |
| メモ | 現場メモ（物件紐づけ可） |

データはブラウザの `localStorage` に保存されます。ヘッダーの **書出 / 読込** で JSON バックアップができます。

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 で確認。

```bash
npm run build
npm run lint
```

## デプロイ（Netlify）

- `netlify.toml` で Next.js プラグインを使用
- 本番: `netlify deploy --prod`

## 注意

- 収支・路線価は **全国4区分の概算**。正確な路線価は [国税庁 路線価図](https://www.rosenka.nta.go.jp/) で確認してください。
- 市町村補助金の金額は目安です。申請前に各自治体の公式サイトで最新情報を確認してください。
- `/api/fetch-property` は許可ドメインのみ・レート制限あり（詳細は `lib/fetch-property-guard.ts`）。

## リポジトリ

https://github.com/shosuke8631139/kominka-lab-.git
