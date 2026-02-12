# ポケカ デッキランキングクイズ

2つのデッキ画像を見て「どちらが優勝デッキだった？」を当てる2択クイズのWebアプリです。

- **データ元**: [ポケカブック - ドラパルトex 環境デッキレシピ](https://pokecabook.com/archives/122503)
- **画像**: ポケモンカードゲーム公式のデッキ画像URL（`deckView.php/deckID/xxx.png`）を使用

## セットアップ

```bash
cd pokeca-deck-quiz
npm install
```

## 開発サーバー

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてください。

## データの更新（デッキ一覧・順位の取得）

ポケカブックのアーカイブページからデッキIDと順位を取得し、`public/deck-data.json` を更新します。

```bash
npm run scrape
```

- 取得元: `https://pokecabook.com/archives/122503`
- 出力: `public/deck-data.json`（画像URL・優勝/準優勝/TOP4/TOP8 の情報）

初回はサンプルデータが含まれた `deck-data.json` が既にあります。最新の大会結果で更新したいときに `npm run scrape` を実行してください。

## ビルド

```bash
npm run build
```

## GitHub Pages へのデプロイ

このリポジトリを GitHub にプッシュし、Pages のソースで **GitHub Actions** を選ぶと、`main` ブランチへの push のたびに自動でビルド・デプロイされます。

1. リポジトリの **Settings > Pages** で、Source に **GitHub Actions** を選択
2. （必要なら）**Settings > Actions > General** で Workflow permissions を **Read and write** に
3. `main` に push すると `.github/workflows/deploy.yml` が実行され、`https://<ユーザー名>.github.io/<リポジトリ名>/` に公開されます

**GitHub Pages 上での制限**

- **データの更新・URL追加**は、開発サーバー（`npm run dev`）で動かす API を使うため、**GitHub Pages 上では利用できません**（静的サイトのためサーバーがありません）。
- 公開後は、ビルド時に含めた `public/deck-data.json` と、ブラウザの localStorage に保存済みのデータでのみクイズが動作します。
- 新しいURLのデータを取り込みたい場合は、ローカルで `npm run scrape` や「データを更新」で取得してからビルドし直し、コミット・push してください。

## 技術スタック

- React 18 + TypeScript
- Vite 5

## 注意

- デッキ画像は公式サイト（pokemon-card.com）のURLを参照しています。同一オリジンでない場合はCORSや画像の表示制限が出る場合があります。その場合はバックエンドでプロキシするか、画像を自前でホストする必要があるかもしれません。
