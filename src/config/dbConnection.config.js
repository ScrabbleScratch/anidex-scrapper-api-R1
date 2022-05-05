const {MongoClient} = require("mongodb");
const {DB_HOST} = require('./variables.config')

const client = new MongoClient(DB_HOST);

module.exports = client;