const express = require('express');
const app = express();
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const VALID_API_KEY = process.env.API_KEY;

const checkApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== VALID_API_KEY) {
        return res.status(403).send({
            data: {
                content: "You don't have permission to access this API, please configure your API key in extension config."
            }
        });
    }
    next();
};

app.use(checkApiKey);

app.get('/', (req, res) => {
    const item_id = req.query.item_id;
    if (!item_id) {
        return res.status(400).send({
            data: {
                content: 'item_id is required'
            }
        });
    }

    const url = `https://fanqienovel.com/reader/${item_id}`;

    axios.get(url, {
        responseType: 'arraybuffer'
    })
    .then(response => {
        const html = iconv.decode(Buffer.from(response.data), 'gbk');
        const $ = cheerio.load(html);

        const scriptTag = $('script').filter((i, el) => {
            return $(el).html().includes('window.__INITIAL_STATE__');
        }).first();

        if (!scriptTag.length) {
            return res.status(404).send({
                data: {
                    content: 'Script tag not found'
                }
            });
        }

        const scriptText = scriptTag.html();
        const startPos = scriptText.indexOf('=', scriptText.indexOf('window.__INITIAL_STATE__')) + 1;
        const endPos = scriptText.lastIndexOf(';') - 1;
        let jsonText = scriptText.substring(startPos, endPos + 1).trim();

        const contentMatch = jsonText.match(/"content":"(.*?)","uid"/);
        let content = contentMatch ? contentMatch[1] : null;

        if (!content) {
            return res.status(404).send({
                data: {
                    content: 'Chapter content not found'
                }
            });
        }

        content = content
            .replace(/\\u([\dA-Fa-f]{4})/g, (match, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
            })
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/u003C\/p>/g, '</p>')
            .replace(/u003C/g, '<');

        res.send({
            data: {
                content: content.trim()
            }
        });
    })
    .catch(error => {
        console.error('Axios error:', error.message);
        res.status(500).send({
            data: {
                content: 'Internal server error'
            }
        });
    });
});

module.exports = app;
