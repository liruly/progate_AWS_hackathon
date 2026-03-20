# Backend (FastAPI) 用 Dockerfile
# App Runner の「source」ビルドだと uvicorn が見つからないケースがあるため、
# イメージ内に依存を確実に同梱します。

FROM python:3.11-slim

WORKDIR /app

# 依存だけ先に入れてレイヤーをキャッシュしやすくする
COPY requirements.txt /app/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /app/requirements.txt

# アプリ本体（app/ 配下）をコピー
COPY app /app/app

EXPOSE 8080

# App Runner 側でポートは設定されることが多いですが、ここは 8080 固定で起動します
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

