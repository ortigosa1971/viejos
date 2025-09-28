// server.js
// Proxy + static server for WU PWS history (Railway-friendly)
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WU_API_KEY = process.env.WU_API_KEY;

// Salud
app.get("/health", (_req, res) => res.json({ ok: true }));

// Estáticos
app.use(express.static("public"));

// GET /api/wu/history?stationId=XXXXX&date=YYYYMMDD&units=m
app.get("/api/wu/history", async (req, res) => {
  try {
    const stationId = String(req.query.stationId || "").trim();
    const date = String(req.query.date || "").trim(); // YYYYMMDD
    const units = (req.query.units || "m").toString(); // m=metric, e=imperial

    if (!WU_API_KEY) {
      return res.status(500).json({ error: "Falta WU_API_KEY en el servidor" });
    }
    if (!stationId) {
      return res.status(400).json({ error: "Falta stationId" });
    }
    if (!/^\d{8}$/.test(date)) {
      return res.status(400).json({ error: "date debe ser YYYYMMDD" });
    }

    const url = new URL("https://api.weather.com/v2/pws/history/all");
    url.searchParams.set("stationId", stationId);
    url.searchParams.set("format", "json");
    url.searchParams.set("date", date);
    url.searchParams.set("units", units);
    url.searchParams.set("apiKey", WU_API_KEY);

    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).type("application/json").send(text);
    }

    // Pasa tal cual (JSON o texto JSON)
    const text = await resp.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      res.type("application/json").send(text);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar Weather.com", details: String(err) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${PORT}`);
});
