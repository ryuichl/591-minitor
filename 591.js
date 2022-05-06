;(async function () {
    try {
        const got = require('got')
        const { CookieJar } = require('tough-cookie')

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
        const house_search = async (client, csrf) => {
            const options = {
                method: 'GET',
                url: `https://sale.591.com.tw/home/search/list`,
                headers: {
                    'User-Agent': 'PostmanRuntime/7.29.0',
                    'X-CSRF-TOKEN': csrf
                },
                searchParams: {
                    type: 2,
                    shType: 'list',
                    regionid: 4,
                    section: 371,
                    shape: '1,2',
                    pattern: '3,4',
                    houseage: '3$_10$',
                    area: '25$_45$',
                    price: '1000$_3000$',
                    area: '25$_45$'
                },
                responseType: 'json',
                resolveBodyOnly: true
            }
            const result = await client(options)
            console.log(result)
        }
        const cookieJar = new CookieJar()
        const client = got.extend({ cookieJar })
        const token = await get_csrf(client)
        console.log(token)
        await house_search(client, token)
    } catch (err) {
        console.log(err)
    }
    // return process.exit(0)
})()
