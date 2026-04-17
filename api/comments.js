// Vercel serverless: コメントAPI（メモリ内のみ、再デプロイでリセット）
let store = {};

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET') {
    return res.status(200).json(store);
  }

  if (req.method === 'POST') {
    try {
      const { key, comment } = req.body;
      if (!key || !comment?.text) return res.status(400).json({});
      if (!store[key]) store[key] = [];
      store[key].push({ text: comment.text, ts: comment.ts || new Date().toISOString() });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  return res.status(405).json({});
}
