export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import("../backend/src/server");
    app(req, res);
  } catch (e: any) {
    res.status(500).json({
      error: e.message,
      stack: e.stack?.split("\n").slice(0, 5),
    });
  }
}
