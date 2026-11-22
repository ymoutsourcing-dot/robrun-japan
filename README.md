# ROB RUN JAPAN（非公式）

PC ゲーム「ROB RUN」の非公式・日本語攻略サイト。
Shipments（研究ツリー）全 172 項目を日本語化し、研究費の計算・研究進捗の管理ができます。

> ROB RUN の開発・運営元（Kefir）とは関係のないファンサイトです。

## 機能

| ページ | パス | 内容 |
| --- | --- | --- |
| ホーム | `/` | 各機能への入口・データ状況 |
| 研究ツリー | `/shipments` | React Flow による研究ツリー（拡大縮小・ドラッグ）。スマホはリスト表示が既定 |
| アイテム詳細 | `/shipments/:id` | 日本語/英語説明・研究費・購入/売却価格・前提/派生研究・性能・出典 |
| アイテムDB | `/items` | 日本語・英語・ひらがな検索、カテゴリー/地区Lv/研究状態/用途/レアリティ/研究費で絞り込み、並び替え |
| 費用計算機 | `/calculator?targets=a,b` | 複数目標の必要研究費（研究済み除外・共通前提は1回だけ計上）、購入費は別集計 |
| おすすめ | `/recommended` | ゲームデータから算出した指標（主要目標までの総額、入口の研究、派生の多い研究、服役条件） |
| 進捗 | `/progress` | 研究済み/予定/お気に入り、JSON エクスポート・インポート（LocalStorage 保存） |
| データについて | `/about` | 出典・収録範囲・未確認データの一覧 |
| 更新履歴 | `/changelog` | `data/changelog.json` の内容 |

## 技術構成

React 19 / TypeScript / Vite / Tailwind CSS 3 / React Flow (`@xyflow/react`) / Zustand / React Router / Lucide React

## 開発

```bash
npm install
npm run dev        # データ生成 → 開発サーバー (http://localhost:5173)
npm run build      # データ生成 → データ検証 → 型チェック → 本番ビルド (dist/)
npm run preview    # ビルド結果の確認
```

Node.js 20 以上。

## ディレクトリ構成

```
data/                       ← ゲームデータ（表示ロジックと分離）
  source/shipments.source.json   英語の事実データ（抽出スクリプトが生成）
  i18n/shipments.ja.json         アイテム名・説明の日本語訳（手作業で編集）
  i18n/terms.ja.json             ステータス名などの用語辞書
  guides/recommendations.json    根拠付きのおすすめ度（任意）
  changelog.json                 更新履歴
scripts/
  extract-robrunguide.ts    保存した HTML → data/source/*.json
  build-data.ts             data/* を統合 → src/generated/*.json, public/sitemap.xml, public/robots.txt
  validate-data.ts          整合性チェック（ID重複・存在しない前提・循環・未翻訳 など）
src/
  types/shipment.ts         データ型（ShipmentItem）
  lib/data.ts               検索・前提研究の探索・費用計算
  lib/treeLayout.ts         ツリーの配置計算
  store/progress.ts         進捗（Zustand + LocalStorage）
  pages/ components/        画面
```

`src/generated/` はビルド時に生成されるため、直接編集しないでください。

## データの方針

- 出典: [Rob Run Guide](https://robrunguide.app/en-US/shipments)（ゲームファイル抽出データ。ツリー build 26440801）。
  各項目に出典 URL・取得日・ビルド番号を保持。
- `null` = 未確認、`0` = 確認済みの 0（無料）。サイト上は「未確認」と表示。
- `verificationStatus`: `verified`（ゲーム内で確認）/ `sourced`（外部資料）/ `unverified` / `outdated`。現在は全件 `sourced`。
- 確認できない数値・効果は創作しない。おすすめ度（★）は根拠を書ける項目だけ `data/guides/recommendations.json` に登録。

## データ更新手順

### 翻訳・攻略情報を直す

1. `data/i18n/shipments.ja.json` や `data/guides/recommendations.json` を編集
2. `npm run build`（検証エラーがあればビルドが止まる）

### ゲームのアップデートでデータを取り直す

出典サイトの robots.txt（クロール許可）に従い、**1 リクエスト/秒以下**で取得してください。

```bash
mkdir -p raw/items
curl -sSL -o raw/shipments.html https://robrunguide.app/en-US/shipments
# 各アイテムページ（ID は data/source/shipments.source.json の itemId）
for id in $(node -e 'for (const n of require("./data/source/shipments.source.json").nodes) console.log(n.itemId)'); do
  curl -sSL -o "raw/items/$id.html" "https://robrunguide.app/en-US/items/$id"; sleep 1
done
npm run extract -- raw
npm run build
```

新しい項目が増えた場合は検証で「未翻訳」エラーになるので、`shipments.ja.json` に訳を追加してください。
`raw/` は Git に含めません。変更点は `data/changelog.json` に記録してください。

### ゲーム内で確認した項目を「検証済み」にする

今後の拡張ポイント: `data/verified.json` などで ID ごとに確認日・スクリーンショットを管理し、`build-data.ts` で `verificationStatus: "verified"` を付与する。

## 公開（Vercel）

1. GitHub にリポジトリを作成して push
2. Vercel で「Add New Project」→ リポジトリを選択（Framework: Vite。`vercel.json` で設定済み）
3. 環境変数
   - `SITE_URL`: 公開 URL（例 `https://robrun-japan.vercel.app`）— sitemap/robots に使用
   - `PUBLIC_INDEXING`: 友人限定の間は未設定（`noindex` + `robots.txt` で全拒否）。一般公開時に `true`
4. `main` への push で自動デプロイ

API キー等の秘密情報はフロントエンドに含めていません（現状は不要）。

## 既知の制限

- 購入価格の記載がない 29 項目、売却価格の記載がない 8 項目、レアリティ不明 1 項目は「未確認」表示（`/about` に一覧）
- 注文・配送費、メリット/デメリット等の攻略評価は未収録
- SPA のため、アイテム個別ページのタイトル・説明は JavaScript 実行後に設定（一般公開時はプリレンダリングを検討）
