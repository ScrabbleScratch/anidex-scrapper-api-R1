require("dotenv").config();
const {API_URL} = require('./variables.config')
const axios = require("axios").default;

const Jikan = axios.create({
    baseURL: API_URL
});

module.exports = Jikan;