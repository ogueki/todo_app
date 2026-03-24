export default function handler(req: any, res: any) {
  res.json({ message: "API is alive", path: req.url });
}
