const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const app = express();

app.use(express.json());

const VALID_API_KEY = process.env.API_KEY;

const checkApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== VALID_API_KEY) {
        return res.status(403).json({
            data: { content: "You don't have permission to access this API, please configure your API key in extension config." }
        });
    }
    next();
};

app.get('/', checkApiKey, async (req, res) => {
    const item_id = req.query.item_id;
    if (!item_id) {
        return res.status(400).json({ data: { content: 'item_id is required'.trim() } });
    }

    const url = `https://fanqienovel.com/reader/${item_id}`;

    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0');
        await page.setExtraHTTPHeaders({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
            'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        });

        await page.goto(url, { waitUntil: 'networkidle2' });

        await page.waitForSelector('.muye-reader-content', { timeout: 10000 });

        const content = await page.evaluate(() => {
            const contentDiv = document.querySelector('.muye-reader-content');
            if (contentDiv) {
                const btns = contentDiv.querySelector('.muye-reader-btns');
                if (btns) btns.remove();
                return contentDiv.innerHTML.trim();
            }
            return null;
        });

        await browser.close();

        if (!content) {
            return res.status(404).json({ data: { content: 'Chapter content not found' } });
        }

        res.json({ data: { content: content } });
    } catch (error) {
        console.error('Puppeteer error:', error.message);
        res.status(500).json({ data: { content: `Internal server error: ${error.message}` } });
    }
});

module.exports = app;
