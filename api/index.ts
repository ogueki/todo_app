// api/index.ts
import app from "../backend/src/server";

export default function handler(req: any, res: any) {
  try {
    app(req, res);
  } catch (e: any) {
    res.status(500).json({
      error: e.message,
      stack: e.stack?.split("\n").slice(0, 5),
    });
  }
}