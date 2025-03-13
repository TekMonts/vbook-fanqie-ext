const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

const VALID_API_KEY = process.env.API_KEY;

const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== VALID_API_KEY) {
    return res.status(403).json({ data: { content: "You don't have permission to access this API, please configure your API key in extension config." } });
  }
  next();
};

app.use(checkApiKey);

app.get('/', async (req, res) => {
  const item_id = req.query.item_id;
  if (!item_id) {
    return res.status(400).json({ data: { content: 'item_id is required' } });
  }

  const url = `https://fanqienovel.com/reader/${item_id}`;
  const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
    'cache-control': 'max-age=0',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
    'accept-encoding': 'gzip, deflate, br'
  };

  try {
    const response = await axios.get(url, { headers, responseType: 'arraybuffer', timeout: 10000 });
    const contentEncoding = response.headers['content-encoding']?.toLowerCase() || '';
    let html;
    const buffer = Buffer.from(response.data);
    if (contentEncoding.includes('br')) {
      const brotli = require('brotli');
      const decompressed = brotli.decompress(buffer);
      if (!decompressed) throw new Error('Brotli decompression returned null');
      html = decompressed.toString('utf8');
    } else if (contentEncoding.includes('gzip')) {
      const zlib = require('zlib');
      html = zlib.gunzipSync(buffer).toString('utf8');
    } else if (contentEncoding.includes('deflate')) {
      const zlib = require('zlib');
      html = zlib.inflateSync(buffer).toString('utf8');
    } else {
      html = buffer.toString('utf8');
    }

    const $ = cheerio.load(html);
    const $contentNode = $('.muye-reader-content');
    if ($contentNode.length === 0) {
      return res.status(404).json({ data: { content: 'Content node not found with .muye-reader-content' } });
    }

    const $btnsNode = $contentNode.find('.muye-reader-btns');
    if ($btnsNode.length > 0) {
      $btnsNode.remove();
    }

    const cleanedContent = $contentNode.html().trim();
    res.json({ data: { content: cleanedContent } });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ data: { content: `Internal server error: ${error.message}` } });
  }
});

module.exports = app;
