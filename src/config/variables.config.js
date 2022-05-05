require("dotenv").config();

const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;
const API_URL = process.env.JIKAN_URL;

module.exports = {DB_HOST, DB_NAME, API_URL};