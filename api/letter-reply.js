// Vercel serverless: 偉人からの手紙の返信をClaude APIで生成
//
// 環境変数：ANTHROPIC_API_KEY を Vercel の Project Settings に設定すること
//
// 使い方：POST /api/letter-reply
//   body: { personName, personField, personEra, letterText, quotes: [...] }
//   response: { reply: string }

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { personName, personField, personEra, letterText, quotes } = req.body || {};
    if (!personName || !letterText) {
      return res.status(400).json({ error: 'personName and letterText required' });
    }

    // 入力サイズ制限（悪用対策）
    if (letterText.length > 1200) {
      return res.status(400).json({ error: 'letterText too long' });
    }

    const quoteSamples = Array.isArray(quotes) && quotes.length
      ? quotes.slice(0, 5).map(q => `- 「${q.text}」${q.source ? ` (${q.source})` : ''}`).join('\n')
      : '(名言データなし)';

    const systemPrompt = `あなたは歴史上の偉人「${personName}」になりきって、現代の読者から届いた手紙に日本語で返信する役割です。

【役柄】
- 氏名：${personName}
- 肩書：${personField || '偉人'}
- 時代：${personEra || ''}

【本人が残した言葉（参考）】
${quoteSamples}

【返信のスタイル】
- 手紙の内容に寄り添い、相手の感情を否定せず受け止める
- 上記の名言のうち、相手の悩みに最も合うものを1つ、自然に引用する
- 自分が生きた時代の経験や思想を踏まえて、自分の言葉で語る
- 現代用語（アプリ、ネット、SNS等）は使わない
- 300〜500字程度、3〜4段落
- 「拝啓」や「敬具」は使わず、自然な書簡調で
- 最後は「— ${personName}」で締める

【注意】
- キャラクターを崩さない
- 宗教・政治・医療の断定的なアドバイスは避け、個人的な経験や哲学を語る
- 安全性：自傷・他害の示唆がある場合は、専門家への相談を優しく添える`;

    const userMessage = `以下はあなた（${personName}）に宛てて届いた現代人からの手紙です。心を込めて返信してください。

---
${letterText}
---`;

    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return res.status(502).json({ error: 'AI service error', detail: err });
    }

    const data = await anthropicRes.json();
    const reply = data?.content?.[0]?.text;
    if (!reply) {
      return res.status(502).json({ error: 'No reply generated' });
    }

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
