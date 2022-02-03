const AWS = require('aws-sdk')

const ddb = new AWS.DynamoDB.DocumentClient(
  /true/i.test(process.env.IS_OFFLINE)
    ? {
        region: 'localhost',
        endpoint: 'http://localhost:8000',
      }
    : undefined
)

const TableName = 'unsplash'

module.exports.get = async (query) =>
  await ddb
    .get({ TableName, Key: { query } })
    .promise()
    .then(({ Item }) => Item)

module.exports.put = async (key, data) => {
  console.log('store', key)
  await ddb.put({ TableName, Item: { ...data, query: key } }).promise()
}
