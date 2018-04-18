const puppeteer = require('puppeteer');
let schedule = require('node-schedule');
let mysql = require('mysql');
const moment = require('moment');
let connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'stock'
});
let browser, page;



let rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [new schedule.Range(1, 5)];
rule.hour = 11;
rule.minute = 0;
schedule.scheduleJob(rule, main);


async function main() {
    connection.connect();

    browser = await puppeteer.launch({
        executablePath: 'C://phantomjs/chrome-win32/chrome.exe',
        // executablePath: '/home/gjh/crawler/chrome-linux/chrome',
        headless: false,
        // args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    let urls = ['http://data.10jqka.com.cn/rank/cxg', 'http://data.10jqka.com.cn/rank/cxd']

    await handler(urls[0], 1)
    await handler(urls[1], 2)
    browser.close()
    connection.end();

}

async function handler(url, index) {
    await page.goto(url);
    let aTag = await page.$('#datacenter_change_content > div.table-tab.J-ajax-board > a:nth-child(3)')
    await aTag.click();
    await page.waitFor(2000)
    let count = 0,
        next = [null];
    while (next.length > 0) {
        let curCount = await page.evaluate(() => {
            let selector = '#J-ajax-main > table > tbody tr';
            let trList = [...document.querySelectorAll(selector)];
            return trList.length
        });
        count += curCount
        next = await page.$x('//*[@id="J-ajax-main"]/div[2]/a[contains(text(), "下一页")]')
        if (next.length > 0) {
            await next[0].click()
            await page.waitFor(2000)
        }
    }
    let dateText = await page.$eval("#datacenter_change_content > div:nth-child(3) > div > span", el => el.innerText);
    dateText = dateText.slice(dateText.length - 10, dateText.length)
    let p = moment(dateText).format('YYYY-MM-DD');

    connection.query(`INSERT INTO gd_count(date,count,data_type)values(?,?,?)`, [p, count, index], function () {})
}