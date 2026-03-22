import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
    console.log(`[${new Date().toISOString()}] Proxy request received for /api/rates`);
    const sources = [
      { id: 'dolarapi_bcv', url: 'https://ve.dolarapi.com/v1/dolares/bcv' },
      { id: 'dolarapi_all', url: 'https://ve.dolarapi.com/v1/dolares' },
      { id: 'pydolarve', url: 'https://pydolarve.org/api/v1/dollar?page=bcv' },
      { id: 'exchangerate', url: 'https://api.exchangerate-api.com/v4/latest/USD' }
    ];

    const fetchSource = async (source: typeof sources[0]) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); 
      
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
      const result = await Promise.any(sources.map(s => fetchSource(s)));
      console.log(`[Proxy] Success from ${result.source}`);
      return res.json(result);
    } catch (error: any) {
      console.error("[Proxy] All sources failed or timed out");
      res.status(503).json({ error: "Failed to fetch rates from all sources" });
    }
};
