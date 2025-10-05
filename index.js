// index.js
import express from "express";
import puppeteer from "puppeteer-core";

const app = express();
app.use(express.json());

const BROWSERLESS_ENDPOINT =
  "wss://production-sfo.browserless.io?token=2TBEqOAEHGL4d4Qa9542797f9be7bd50adb8ff99813f8d8e0"; // replace YOUR_TOKEN

app.post("/search", async (req, res) => {
  const query = req.body.query;
  const type = req.body.type || "template"; // template | component | plugin

  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: BROWSERLESS_ENDPOINT,
    });

    const page = await browser.newPage();
const url = `https://www.framer.com/marketplace/search/?q=${encodeURIComponent(query).replace(/%20/g, "+")}&type=${type}`;


    console.log(`Scraping: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2" });
    await autoScroll(page);

    const data = await page.evaluate((type) => {
      let selector;
      switch (type) {
        case "component":
          selector = 'a[href^="/marketplace/components/"]';
          break;
        case "plugin":
          selector = 'a[href^="/marketplace/plugins/"]';
          break;
        default:
          selector = 'a[href^="/marketplace/templates/"]';
      }

      const cards = document.querySelectorAll(selector);
      const seen = new Set();
      const results = [];

      cards.forEach((a) => {
        const href = a.getAttribute("href");
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Skip base pages and category pages
        if (href === `/marketplace/${type}s/` || href.includes("/category/")) return;

        const container = a.closest("article, div");

        const title =
          container?.querySelector("h2, h3, .text-h6, [class*='Title'], [class*='title']")?.innerText?.trim() ||
          a.getAttribute("aria-label");

        if (!title) return; // skip items with no title

        const creator =
          container?.querySelector('a[href*="/creators/"]')?.innerText?.trim() ||
          container?.innerText?.match(/By\s+([A-Z][A-Za-z0-9\s]+)/i)?.[1] ||
          "Unknown";

        // Try multiple ways to get price
        let price = "N/A";
        const priceText = container?.innerText?.match(/\$[0-9]+(?:\.[0-9]{2})?|Free/i);
        if (priceText) price = priceText[0];

        const img = container?.querySelector("img");
        const thumbnail = img ? img.src : null;

        results.push({
          title,
          link: `https://www.framer.com${href}`,
          price,
          creator,
          thumbnail,
        });
      });

      return results;
    }, type);

    await browser.close();

    return res.json({
      query,
      type,
      count: data.length,
      results: data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
