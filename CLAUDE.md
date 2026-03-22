# TaskBoard

Backlog風タスク管理WEBアプリケーション。

## 技術スタック
- **フロントエンド**: React + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **バックエンド**: Node.js + Express + TypeScript (`backend/`)
- **DB**: SQLite (better-sqlite3)

## ディレクトリ構成
```
todoapp/
├── CLAUDE.md
├── docs/
│   └── spec.md          # 仕様書
├── backend/
│   ├── src/
│   └── package.json
└── frontend/
    ├── src/
    └── package.json
```

## 開発ルール
- 日本語で応答すること
- 仕様は `docs/spec.md` に記載。実装前に仕様を確認すること
- TypeScript: `verbatimModuleSyntax: true` → 型は `import type` を使う
- APIのベースパスは `/api`
- Viteのプロキシで `/api` → バックエンド（port 3001）に転送

## 起動方法
```bash
# バックエンド (port 3001)
cd backend && npm run dev

# フロントエンド (port 5173)
cd frontend && npm run dev
```
