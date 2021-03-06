;(async function () {
    try {
        const db_des = './db/591.json'
        let db = require(db_des)
        const got = require('got')
        const { CookieJar } = require('tough-cookie')
        const fs = require('fs-extra')
        const argv = require('yargs').argv
        const Promise = require('bluebird')
        const CronJob = require('cron').CronJob
        const dayjs = require('dayjs')

        const get_csrf = async (client) => {
            const options = {
                method: 'GET',
                url: `https://sale.591.com.tw/`,
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.0'
                },
                responseType: 'text',
                resolveBodyOnly: true
            }
            const html = await client(options)
            const start_index = html.indexOf('<meta name="csrf-token" content="')
            const end_index = html.indexOf('">', start_index)
            const token = html.slice(start_index + 33, end_index)
            return token
        }
        const house_search = async (client, csrf, firstRow = 0) => {
            const options = {
                method: 'GET',
                url: `https://sale.591.com.tw/home/search/list`,
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.0',
                    'X-CSRF-TOKEN': csrf
                },
                searchParams: {
                    firstRow,
                    type: 2,
                    shType: 'list',
                    regionid: 4,
                    section: 371,
                    shape: '1,2',
                    pattern: '3,4',
                    houseage: '3$_5$',
                    area: '25$_45$',
                    price: '1000$_3000$'
                },
                responseType: 'json',
                resolveBodyOnly: true
            }
            const result = await client(options)
            return result
        }
        const message_template = (status, house) => {
            const message =
                status +
                '\n' +
                '?????? : ' +
                dayjs().format('YYYY/MM/DD HH:mm:ss') +
                '\n' +
                '?????? : ' +
                house.title +
                '\n' +
                '?????? : ' +
                house.price +
                '\n' +
                '?????? : ' +
                house.mainarea +
                '\n' +
                '?????? : ' +
                house.room +
                '\n' +
                '?????? : ' +
                `https://sale.591.com.tw/home/house/detail/2/${house.houseid}.html`
            return message
        }
        const line_notify = async (keys, message) => {
            if (keys.length === 0) {
                return true
            }
            let options = {
                method: 'POST',
                url: 'https://notify-api.line.me/api/notify',
                headers: {},
                form: {
                    message: message
                },
                responseType: 'json',
                resolveBodyOnly: true
            }
            const result = await Promise.map(keys, (key) => {
                options.headers.Authorization = `Bearer ${key}`
                return got(options)
            })
            return result
        }

        const line_keys = ['']
        const cookieJar = new CookieJar()
        const client = got.extend({ cookieJar })

        if (argv.job === 'init') {
            const token = await get_csrf(client)
            const search_result = await house_search(client, token)
            const total_rows = Number(search_result.data.total)
            const houses = {}
            let offset = 0
            await Promise.mapSeries([...Array(Math.ceil(total_rows / 30))], async (e) => {
                const search_result = await house_search(client, token, offset)
                search_result.data.house_list.map((house) => {
                    houses[house.houseid] = house
                })
                offset += 30
            })
            await fs.outputJson(db_des, houses)
            console.log(Object.keys(houses).length)
            console.log('init done')
            return process.exit(0)
        } else if (argv.job === 'line') {
            const message = message_template('?????????', db['10980919'])
            await line_notify(line_keys, message)
            return process.exit(0)
        }
        const job = new CronJob({
            cronTime: '0 */5 * * * *',
            onTick: async () => {
                console.log(`job start ${dayjs().format()}`)
                const token = await get_csrf(client)
                const search_result = await house_search(client, token)
                const total_rows = search_result.data.total
                let offset = 0
                await Promise.mapSeries([...Array(Math.ceil(total_rows / 30))], async (e) => {
                    const search_result = await house_search(client, token, offset)
                    await Promise.mapSeries(search_result.data.house_list, async (house) => {
                        if (!db.hasOwnProperty(house.houseid)) {
                            db[house.houseid] = house
                            await fs.outputJson(db_des, db)
                            console.log(house.houseid)
                            const message = message_template('?????????', house)
                            await line_notify(line_keys, message)
                        }
                    })
                    offset += 30
                })
                console.log('done')
            },
            start: true,
            timeZone: 'Asia/Taipei'
        })
        console.log('is job running? ', job.running)
    } catch (err) {
        console.log(err)
    }
    // return process.exit(0)
})()
