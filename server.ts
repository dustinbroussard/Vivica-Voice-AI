import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Parser from 'rss-parser';

const parser = new Parser();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware
  app.use(express.json());

  // API Route for RSS
  app.post('/api/rss', async (req, res) => {
    try {
      const { feeds } = req.body;
      if (!Array.isArray(feeds)) {
         res.status(400).json({ error: 'feeds must be an array of URLs' });
         return;
      }
      
      const allArticles = [];
      for (const feedUrl of feeds) {
        try {
          const feed = await parser.parseURL(feedUrl);
          const limit = 8;
          const articles = feed.items.slice(0, limit).map(item => ({
            title: item.title || '',
            link: item.link || '',
            contentSnippet: item.contentSnippet || item.content || '',
            pubDate: item.pubDate || '',
            source: feed.title || feedUrl
          }));
          allArticles.push(...articles);
        } catch (e) {
          console.error(`Failed to parse feed: ${feedUrl}`, e);
        }
      }

      // Deduplication based on title similarity
      const dedupedArticles = [];
      for (const article of allArticles) {
        let isDuplicate = false;
        for (const existing of dedupedArticles) {
          if (calculateSimilarity(article.title.toLowerCase(), existing.title.toLowerCase()) > 0.8) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          dedupedArticles.push(article);
        }
      }

      res.json({ articles: dedupedArticles });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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
    // Express 4 uses '*', Express 5 uses '*all'
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function calculateSimilarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toString());
}

function editDistance(s1: string, s2: string): number {
  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

startServer();
