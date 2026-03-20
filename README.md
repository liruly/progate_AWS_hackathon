# 0320 AWS Hackathon (Nutrition Suggest)

FastAPI (backend) + React/Vite (frontend) のサンプルです。

## Backend (FastAPI) 起動

### MacOS / Linux 共通（最初だけ依存インストール）

```sh
cd backend
python3 -m pip install -r requirements.txt
```

### MacOS で起動

```sh
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### WSL で起動

WSL でも基本は同じです（WSLのシェルで実行）。

```sh
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 動作確認

別ターミナルで以下が通ればOKです。

```sh
curl http://localhost:8000/api/products
```

## Frontend (React/Vite) 起動

```sh
cd frontend
npm ci
npm run dev -- --host
```

### 注意: `frontend/public/config.json` について

フロント側は `frontend/public/config.json` の `apiBaseUrl` を見て API を呼びます。
`apiBaseUrl` がプレースホルダのままだとローカル動作しません。

ローカルで動かすなら、次を `frontend/public/config.json` に設定してください。

```json
{ "apiBaseUrl": "http://localhost:8000" }
```

## ついで（AWSで切り替えたい場合）

`apiBaseUrl` を App Runner のサービスURL（またはAPIドメイン）に差し替えるだけで FE 側から接続できます。

## Frontend を AWS Amplify にデプロイする

リポジトリ直下に `amplify.yml`（モノレポ用）があります。**アプリのルートが `frontend` のとき**に使います。

1. Amplify コンソールでアプリ作成 → GitHub 連携 → ブランチ選択
2. **モノレポ**を有効にし、**アプリのルート**に `frontend` を指定（`amplify.yml` の `appRoot` と一致）
3. 環境変数に **`AMPLIFY_MONOREPO_APP_ROOT` = `frontend`** が付いているか確認（手動で追加してもよい）
4. `frontend/public/config.json` の `apiBaseUrl` に **App Runner の API URL** を入れてから push

**SPA（React Router）**: デプロイ後、Amplify の **Rewrites and redirects** で `404 → /index.html`（または公式の SPA 用ルール）を追加すると、`/store` などの直リンクが動きます。

## Docker（バックエンド）

`App Runner の source ベースだと `uvicorn` が実行環境に無い問題` が起きる場合は、バックエンドを Docker 化して ECR イメージとして App Runner で起動するのが確実です。

- Dockerfile: `backend/Dockerfile`


