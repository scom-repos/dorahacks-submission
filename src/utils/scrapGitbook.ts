import axios from 'axios';
import * as cheerio from 'cheerio';
import { HtmlToText } from 'html-to-text-conv';

interface PageContent {
    url: string;
    text: string;
}

const getLinks = async (url: string): Promise<string[]> => {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const links = new Set<string>();

    $('a').each((index: number, elem: cheerio.Element) => {
        const href = $(elem).attr('href');
        if (href && href.startsWith('/')) {
            const fullUrl = new URL(href, url).href;
            links.add(fullUrl);
        }
    });

    return Array.from(links);
}

const extractTextFromUrl = async (url: string): Promise<string> => {
    try {
        const response = await axios.get(url);
        let html = response.data;

        const $ = cheerio.load(html);

        // ✅ Remove images, scripts, styles, and menu (nav)
        $('img, script, style, nav, ul, header, a').remove();

        // Optionally remove other elements like footers or headers if needed:
        // $('footer, header').remove();

        html = $.html();

        const converter = new HtmlToText();
        const text = converter.convert(html);

        return text.trim();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return '';
    }
}

export const scrapeGitbook = async (baseUrl: string): Promise<PageContent[]> => {
    console.log(`Getting links from ${baseUrl}`);
    const links = await getLinks(baseUrl);

    // Include the base URL itself
    links.unshift(baseUrl);

    const results: PageContent[] = [];

    for (const link of links) {
        // console.log(`\nExtracting content from: ${link}`);
        const text = await extractTextFromUrl(link);
        results.push({ url: link, text: text.replace(/\n/g, '') });
    }

    console.log(`Found ${links.length} pages.`);

    return results;
}