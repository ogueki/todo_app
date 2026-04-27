# TaskBoard

Backlog風タスク管理WEBアプリケーション。

## 技術スタック
- **フロントエンド**: React + TypeScript + Vite + Tailwind CSS + React Router (`frontend/`)
- **バックエンド**: Node.js + Express + TypeScript (`backend/`)
- **DB**: PostgreSQL (Supabase)
- **ストレージ**: Supabase Storage（アバター画像）
- **デプロイ**: フロントエンド → Vercel / バックエンド → Render（Web Service・無料枠）

## ディレクトリ構成
```
todoapp/
├── CLAUDE.md
├── docs/
│   └── spec.md                # 仕様書
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express APIサーバー
│   │   └── database.ts        # PostgreSQL接続（pg Pool）
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
├── migrations/                # 追加マイグレーション（002, 003 …）
├── supabase-migration.sql     # 初期スキーマ＆シードデータ
└── vercel.json                # Vercel SPA リライト設定
```

## 開発ルール
- 日本語で応答すること
- 仕様は `docs/spec.md` に記載。実装前に仕様を確認すること
- TypeScript: `verbatimModuleSyntax: true` → 型は `import type` を使う
- APIのベースパスは `/api`
- ローカル開発: Viteのプロキシで `/api` → バックエンド（port 3001）に転送
- 本番: フロントは `VITE_API_BASE` で Render 上のバックエンドURLを直接参照

## 起動方法
```bash
# バックエンド (port 3001)
cd backend && npm run dev

# フロントエンド (port 5173)
cd frontend && npm run dev
```
