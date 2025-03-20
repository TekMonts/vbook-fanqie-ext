const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const VALID_API_KEY = process.env.API_KEY;

const charset = [["D","在","主","特","家","军","然","表","场","4","要","只","v","和","?","6","别","还","g","现","儿","岁","?","?","此","象","月","3","出","战","工","相","o","男","直","失","世","F","都","平","文","什","V","O","将","真","T","那","当","?","会","立","些","u","是","十","张","学","气","大","爱","两","命","全","后","东","性","通","被","1","它","乐","接","而","感","车","山","公","了","常","以","何","可","话","先","p","i","叫","轻","M","士","w","着","变","尔","快","l","个","说","少","色","里","安","花","远","7","难","师","放","t","报","认","面","道","S","?","克","地","度","I","好","机","U","民","写","把","万","同","水","新","没","书","电","吃","像","斯","5","为","y","白","几","日","教","看","但","第","加","候","作","上","拉","住","有","法","r","事","应","位","利","你","声","身","国","问","马","女","他","Y","比","父","x","A","H","N","s","X","边","美","对","所","金","活","回","意","到","z","从","j","知","又","内","因","点","Q","三","定","8","R","b","正","或","夫","向","德","听","更","?","得","告","并","本","q","过","记","L","让","打","f","人","就","者","去","原","满","体","做","经","K","走","如","孩","c","G","给","使","物","?","最","笑","部","?","员","等","受","k","行","一","条","果","动","光","门","头","见","往","自","解","成","处","天","能","于","名","其","发","总","母","的","死","手","入","路","进","心","来","h","时","力","多","开","已","许","d","至","由","很","界","n","小","与","Z","想","代","么","分","生","口","再","妈","望","次","西","风","种","带","J","?","实","情","才","这","?","E","我","神","格","长","觉","间","年","眼","无","不","亲","关","结","0","友","信","下","却","重","己","老","2","音","字","m","呢","明","之","前","高","P","B","目","太","e","9","起","稜","她","也","W","用","方","子","英","每","理","便","四","数","期","中","C","外","样","a","海","们","任"],["s","?","作","口","在","他","能","并","B","士","4","U","克","才","正","们","字","声","高","全","尔","活","者","动","其","主","报","多","望","放","h","w","次","年","?","中","3","特","于","十","入","要","男","同","G","面","分","方","K","什","再","教","本","己","结","1","等","世","N","?","说","g","u","期","Z","外","美","M","行","给","9","文","将","两","许","张","友","0","英","应","向","像","此","白","安","少","何","打","气","常","定","间","花","见","孩","它","直","风","数","使","道","第","水","已","女","山","解","d","P","的","通","关","性","叫","儿","L","妈","问","回","神","来","S","","四","望","前","国","些","O","v","l","A","心","平","自","无","军","光","代","是","好","却","c","得","种","就","意","先","立","z","子","过","Y","j","表","","么","所","接","了","名","金","受","J","满","眼","没","部","那","m","每","车","度","可","R","斯","经","现","门","明","V","如","走","命","y","6","E","战","很","上","f","月","西","7","长","夫","想","话","变","海","机","x","到","W","一","成","生","信","笑","但","父","开","内","东","马","日","小","而","后","带","以","三","几","为","认","X","死","员","目","位","之","学","远","人","音","呢","我","q","乐","象","重","对","个","被","别","F","也","书","稜","D","写","还","因","家","发","时","i","或","住","德","当","o","l","比","觉","然","吃","去","公","a","老","亲","情","体","太","b","万","C","电","理","?","失","力","更","拉","物","着","原","她","工","实","色","感","记","看","出","相","路","大","你","候","2","和","?","与","p","样","新","只","便","最","不","进","T","r","做","格","母","总","爱","身","师","轻","知","往","加","从","?","天","e","H","?","听","场","由","快","边","让","把","任","8","条","头","事","至","起","点","真","手","这","难","都","界","用","法","n","处","下","又","Q","告","地","5","k","t","岁","有","会","果","利","民"]];

class NovelDownloader {
    constructor(charset) {
        this.charset = charset;
    }

    decodeContent(content, mode = 0) {
        let result = '';
        for (const char of content) {
            const uni = getUnicode(char);
            const bias = uni - 58344;
            if (bias >= 0 && bias < this.charset[mode].length && this.charset[mode][bias] !== '?') {
                result += this.charset[mode][bias];
            } else {
                result += char;
            }
        }
        return result;
    }

    fallbackDecode(content) {
        content = content.slice(6);
        let tmp = 1;
        let result = '';
        for (const char of content) {
            if (char === '<') {
                tmp += 1;
            } else if (char === '>') {
                tmp -= 1;
            } else if (tmp === 0) {
                result += char;
            } else if (tmp === 1 && char === 'p') {
                result = (result + '\n').replace(/\n\n/g, '\n');
            }
        }
        return result;
    }
}

function getUnicode(char) {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined ? codePoint : char.charCodeAt(0);
}

const nd = new NovelDownloader(charset);

const checkApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== VALID_API_KEY) {
        return res.status(403).json({
            data: {
                content: "You don't have permission to access this API, please configure your API key in extension config."
            }
        });
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
        'cookie': 'webfont=DNMrHsV173Pd4pgy',
        'accept-encoding': 'gzip, deflate, br'
    };

    try {
        const response = await axios.get(url, { headers, responseType: 'arraybuffer', timeout: 10000 });
        const buffer = Buffer.from(response.data);
        const html = buffer.toString('utf8');
        const $ = cheerio.load(html);

        const $contentNode = $('.muye-reader-content');
        if ($contentNode.length === 0) {
            return res.status(404).json({ data: { content: 'Content node not found with .muye-reader-content' } });
        }

        const $btnsNode = $contentNode.find('.muye-reader-btns');
        if ($btnsNode.length > 0) {
            $btnsNode.remove();
        }

        const content = $contentNode.html().trim();
        let decodedContent;
        try {
            decodedContent = nd.decodeContent(content);
        } catch (error) {
            try {
                decodedContent = nd.decodeContent(content, 1);
            } catch (error) {
                decodedContent = nd.fallbackDecode(content);
            }
        }
        const transformedContent = decodedContent
            .replace(/<br\s*\/?>/gi, '<br><br>')
            .replace(/\n/g, '<br><br>');

        res.json({ data: { content: transformedContent } });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ data: { content: `Internal server error: ${error.message}` } });
    }
});

module.exports = app;
