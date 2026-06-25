export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.VITE_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Extraer el texto y devolverlo directamente ya limpio
    const raw = data.content?.map(b => b.text || "").join("").trim() || "";
    const clean = raw.replace(/^```json|^```|```$/gm, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : clean;

    try {
      const parsed = JSON.parse(jsonStr);
      res.status(200).json(parsed);
    } catch {
      // Si no parsea, devolver el texto crudo para debug
      res.status(200).json({ raw, jsonStr, error: "parse_failed" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
