import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Code snippet is required' });
  }

  try {
    const backendURL = 'http://localhost:8000/api/classify'; // ✅ Set this to your Python FastAPI endpoint

    const response = await fetch(backendURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Classifier backend error:', result);
      return res.status(response.status).json({ error: result?.detail || 'Backend error' });
    }

    if (result.success && result.data) {
      return res.status(200).json(result.data); // ✅ return only the flat classification result
    }

    console.error('❌ Invalid classifier result structure:', result);
    return res.status(500).json({ error: result.error || 'Invalid classifier response' });

  } catch (err: any) {
    console.error('❌ Exception while calling classifier backend:', err);
    return res.status(500).json({ error: 'Classification failed due to internal error.' });
  }
}
