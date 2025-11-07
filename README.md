<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1QnI2NsjkyHbU557yXJ2Y570PlhSFtPs0

## Run Locally

**Prerequisites:** Node.js 18+ (Node 20 推奨)

1. 依存関係をインストール:
   `npm install`
2. 開発サーバー起動:
   `npm run dev`

※ このアプリは API キー不要で動作します（音声録音と ZIP 生成のみ）。

## Deploy: GitHub Pages

このリポジトリには GitHub Pages への自動デプロイ用ワークフロー（`.github/workflows/deploy.yml`）が含まれます。通常は以下の手順だけで公開できます。

1. リポジトリのデフォルトブランチを `main` にする（またはワークフローの `branches` を使用するブランチ名に変更）
2. GitHub のリポジトリ設定 → Pages → Build and deployment で「GitHub Actions」を選択
3. `main` に push すると自動でビルド・デプロイが実行されます

メモ:
- Vite の `base` は `vite.config.ts` で `/workshop/` に設定済みです。リポジトリ名を変更する場合は `base` も合わせて変更してください。
- マイク録音は HTTPS 環境で有効（GitHub Pages は HTTPS なので OK）。
- iOS/Safari では `MediaRecorder` の仕様差異により挙動が異なる場合があります。
