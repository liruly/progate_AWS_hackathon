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

## Docker（バックエンド）

`App Runner の source ベースだと `uvicorn` が実行環境に無い問題` が起きる場合は、バックエンドを Docker 化して ECR イメージとして App Runner で起動するのが確実です。

- Dockerfile: `backend/Dockerfile`


