import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", nodeVersion: process.version });
  });

  // API Proxy for Dollar Rates to avoid CORS issues
  app.get("/api/rates", async (req, res) => {
    console.log(`[${new Date().toISOString()}] Proxy request received for /api/rates`);
    const sources = [
      { id: 'dolarapi_bcv', url: 'https://ve.dolarapi.com/v1/dolares/bcv' },
      { id: 'dolarapi_all', url: 'https://ve.dolarapi.com/v1/dolares' },
      { id: 'pydolarve', url: 'https://pydolarve.org/api/v1/dollar?page=bcv' },
      { id: 'exchangerate', url: 'https://api.exchangerate-api.com/v4/latest/USD' }
    ];

    // Try to fetch from all sources in parallel, but return the first successful one
    const fetchSource = async (source: typeof sources[0]) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout per source
      
      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return { source: source.id, data };
        }
        throw new Error(`Status ${response.status}`);
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      // We use Promise.any to get the first successful response
      // If all fail, it will throw an AggregateError
      const result = await Promise.any(sources.map(s => fetchSource(s)));
      console.log(`[Proxy] Success from ${result.source}`);
      return res.json(result);
    } catch (error: any) {
      console.error("[Proxy] All sources failed or timed out");
      res.status(503).json({ error: "Failed to fetch rates from all sources" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
