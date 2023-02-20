import puppeteer from 'puppeteer'
import * as fs from 'fs'
import { load } from 'cheerio'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function isValidHttpUrl(string) {
	let url
	try {
		url = new URL(string)
	} catch (_) {
		return false
	}
	return url.protocol === 'http:' || url.protocol === 'https:'
}

const url = process.argv.slice(2)[0]
if (!isValidHttpUrl(url)) throw new Error(`Invalid URL`)

const region = process.argv.slice(2)[1]
if (!region) throw new Error(`Invalid region`)

const data = {}

const parser = async () => {
	try {
		const browser = await puppeteer.launch()
		const page = await browser.newPage()
		await page.goto(url)

		await page.setViewport({
			width: 1920,
			height: 1080
		})

		await page.waitForSelector('#__next > div > header > div.FirstHeader_firstHeader__hbuc7 > div > div')
		await sleep(500)

		const html = await page.content()
		const $1 = load(html)
		const text = $1('#__next > div > header > div.FirstHeader_firstHeader__hbuc7 > div > div > span').text()

		if (text !== region) {
			await page.click('#__next > div > header > div.FirstHeader_firstHeader__hbuc7 > div > div')
			await sleep(1000)

			await page.evaluate((region) => {
				const regions = document.querySelectorAll('.RegionModal_list__IzXxc > div')
				regions.forEach((item) => {
					if (item.textContent === region) {
						item.click()
					}
				})
			}, region)

			await page.waitForNavigation()
			await sleep(500)
		}

		const html2 = await page.content()
		const $2 = load(html2)

		const priceOld = $2('#product-page-buy-block > div:nth-child(3) > div.BuyQuant_price__7f54F > div.BuyQuant_oldPrice__ZIS2V > span.Price_price__B1Q8E.Price_role_old__qW2bx')
			.text()
			.replace(' ₽/шт', '')
			.replace(' ₽', '')
			.replace(',', '.')

		if (priceOld) data.priceOld = priceOld

		data.price = $2('#product-page-buy-block > div:nth-child(3) > div.BuyQuant_price__7f54F > div.Price_priceDesktop__P9b2W > span')
			.text()
			.replace(' ₽/шт', '')
			.replace(' ₽', '')
			.replace(',', '.')

		data.rating = $2(
			'#__next > div > main > div:nth-child(3) > div > div.ProductPage_aboutAndReviews__fAqDi > div > section.Summary_section__PRqXG > div:nth-child(6) > div > div.Summary_title__Uie8u'
		).text()

		data.reviewCount = $2(
			'#__next > div > main > div:nth-child(3) > div > div.ProductPage_aboutAndReviews__fAqDi > div > section.Summary_section__PRqXG > div.Summary_reviewsContainer__dIgJ_.Summary_reviewsCountContainer__4GijP > div > div'
		)
			.text()
			.replace('оценок', '')

		await page.screenshot({ path: 'screenshot.jpg' })

		await browser.close()
	} catch (err) {
		console.log(`Error in parser func => ${err}`)
	}
}

const formFiles = async () => {
	try {
		const txtString = `price=${data.price}\npriceOld=${data.priceOld}\nrating=${data.rating}\nreviewCount=${data.reviewCount}`

		fs.writeFileSync('./product.txt', txtString)
	} catch (err) {
		console.log(`Erorr in formFiles func => ${err}`)
	}
}

await parser()
await formFiles()
