const { get, put } = require('./dynamodb')
const axios = require('axios')

const MAX_AGE = 5 * 60 * 1000

module.exports.url = async (event) => {
  let query = Object.entries(event.queryStringParameters || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map((v) => v.join('='))
    .join('&')

  const key = `${event.path}|${query}`

  const cached = await get(key)
  let response = cached?.response

  if (!response || Date.now() - cached.time >= MAX_AGE) {
    let path = event.path
    if (!path && !path.startsWith('/')) path = '/' + path
    if (query) query = '?' + query
    const url = `https://api.unsplash.com${path}${query}`
    console.log('request', url)

    try {
      const result = await axios(url, {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ID}` },
      })
      if (!/^2\d{2}$/.test(result.status)) throw result

      const item = {
        time: Date.now(),
        response: {
          statusCode: result.status,
          body: JSON.stringify(result.data),
        },
      }

      await put(key, item).catch((v) => console.error('failed to store', v))
      response = item.response
    } catch (e) {
      console.error(e)
      if (!response)
        response = {
          statusCode: e?.response?.status ?? 400,
          body: JSON.stringify(e?.response?.data),
        }
    }
  }

  return {
    ...(response ?? { statusCode: 400 }),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  }
}
