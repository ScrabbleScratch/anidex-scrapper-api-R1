require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const {MongoClient} = require("mongodb");
const axios = require("axios").default;

const app = express();
app.use(bodyparser.urlencoded({extended: true}));

const Jikan = axios.create({
    baseURL: process.env.JIKAN_URL
});

const dbUri = process.env.DB_HOST;
const client = new MongoClient(dbUri);

async function insertData(category, docs) {
    try {
        await client.connect();
        const database = client.db(process.env.DB_NAME);
        const collection = database.collection(category);

        //const filter = {"data.mal_id": docs.data.mal_id}

        let response = {
            success: false,
            operation: null,
            ids: null
        };

        //const existing = await collection.findOne(filter);
        const existing = false;
        if (existing) {
            const queryResult = await collection.findOneAndReplace(filter, docs);
            response = {
                success: queryResult.lastErrorObject.updatedExisting,
                operation: "update",
                ids: queryResult.value._id
            };
        } else {
            const queryResult = await collection.insertMany(docs);
            console.log(queryResult);
            response = {
                success: queryResult.acknowledged,
                operation: "insert",
                ids: queryResult.insertedIds
            };
        }
        return response;
    } finally {
        await client.close();
    }
}

app.get("/anime/:id", (req, res) => {
    const current = "ANIME: " + req.params.id + ": ";
    Jikan.get("anime/" + req.params.id).then(async ({status, data}) => {
        if ("data" in data) {
            console.log(current + status);
            const response = await insertData("animes", data).catch(console.dir);
            res.status(status);
            res.send(response);
        } else {
            if ("status" in data) {
                console.log(current + data.status);
                res.status(data.status);
                res.send(data);
            } else {
                console.log(current + 501);
                res.status(501);
                res.send(data);
            }
        }
        
    }).catch((err) => {
        if (err.response) {
            console.log(current + err.response.status);
            res.status(err.response.status);
            res.send(err.response.data);
        } else {
            console.log(err);
            res.status(400);
            res.send(err);
        }
    });
});

app.get("/characters/:page", (req, res) => {
    const current = "CHARACTERS PAGE: " + req.params.page + ": ";
    Jikan.get("characters?page=" + req.params.page).then(async ({status, data}) => {
        if ("data" in data && "pagination" in data) {
            console.log(current + status);
            const dbRS = await insertData("characters", data.data).catch(console.dir);
            const response = {
                pagination: data.pagination,
                response: dbRS
            }
            res.status(status);
            res.send(response);
        } else {
            if ("status" in data) {
                console.log(current + data.status);
                res.status(data.status);
                res.send(data);
            } else {
                console.log(current + 501);
                res.status(501);
                res.send(data);
            }
        }
        
    }).catch((err) => {
        if (err.response) {
            console.log(current + err.response.status);
            res.status(err.response.status);
            res.send(err.response.data);
        } else {
            console.log(err);
            res.status(400);
            res.send(err);
        }
    });
});

app.get("/manga/:id", (req, res) => {
    const current = "MANGA: " + req.params.id + ": ";
    Jikan.get("manga/" + req.params.id).then(async ({status, data}) => {
        if ("data" in data) {
            console.log(current + status);
            const response = await dbQuery("mangas", data).catch(console.dir);
            res.status(status);
            res.send(response);
        } else {
            if ("status" in data) {
                console.log(current + data.status);
                res.status(data.status);
                res.send(data);
            } else {
                console.log(current + 501);
                res.status(501);
                res.send(data);
            }
        }
        
    }).catch((err) => {
        if (err.response) {
            console.log(current + err.response.status);
            res.status(err.response.status);
            res.send(err.response.data);
        } else {
            console.log(err);
            res.status(400);
            res.send(err);
        }
    });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => {console.log("Server running!")});