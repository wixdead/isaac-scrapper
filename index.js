const puppeteer = require('puppeteer')
const { Pool } = require('pg')
const process = require('node:process')

const pool = new Pool({
  connectionString: 'postgresql://postgres:secretpassword@localhost:5432/isaac_items',
  idleTimeoutMillis: 20000
})


async function fillDatabase(version){
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('https://platinumgod.co.uk/', { waitUntil: 'domcontentloaded' })

  await page.waitForSelector('.main')

  let itemsObject = await page.evaluate(vers => {
    let itemsArray = []
    let div = document.querySelectorAll(`.${vers}items-container`)
    let items = div[0].querySelectorAll('.textbox')
    let ids = [] // Save ids to detect if there are duplicates
    items.forEach(item => {
      let idSelector = +item.querySelector('.r-itemid').textContent.replace('ItemID: ', '')
      let child = item.querySelector('ul > p:nth-child(2)').textContent.replace('Item Pool: ', '').startsWith('Recharge')
        ? 3 : 2
      
      itemsArray.push({
        item_id: ids.includes(idSelector) ? idSelector + 0.5 : idSelector,
        name: item.querySelector('.item-title').textContent.replace("'", "''"),
        description: item.querySelector('p:nth-child(5)').textContent.replaceAll("'", "''"),
        quality: +item.querySelector('.quality').textContent.replace('Quality: ', ''),
        item_pool: item.querySelector(`ul > p:nth-child(${child})`).textContent.replace('Item Pool: ', '').replace("'", "''"),
        type: item.querySelector('ul > p:nth-child(1)').textContent.replace('Type: ', ''),
      })
      ids.push(idSelector)
    })
    return itemsArray
  }, version)
  await browser.close()
  return itemsObject
}

// fillDatabase('repentance').then((data) => console.log(data))

async function init() {
  const response = await fillDatabase('repentance')

  for(const item of response){
    try{
      const res = await pool.query(`INSERT INTO items(item_id, name, description, quality, item_pool) VALUES (${item.item_id}, '${item.name}', '${item.description}', ${item.quality}, '${item.item_pool}')`)
      console.log(res.command)
    }catch(err) {
      console.log(err)
      process.exit(0)
    }
    // console.log(`${item.item_id}, '${item.name}', ${item.description}, ${item.item_pool}, ${item.type}`)
  }
}

init()
