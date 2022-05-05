require('dotenv').config();
const express = require('express');
const bodyparser = require('body-parser');

const v3 = require('./src/routes/v3/router');
const v4 = require('./src/routes/v4/router');

const app = express();
app.use(bodyparser.urlencoded({extended: true}));

app.use('/v3', v3);
app.use('/v4', v4);

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => {console.log("Server running!")});

// EXPORT EXPRESS API
module.exports = app;