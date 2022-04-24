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

//INSERT DATA FROM SINGLE REQUEST
async function insertSingleData(category, doc) {
    try {
        await client.connect();
        const database = client.db(process.env.DB_NAME);
        const collection = database.collection(category);

        const filter = {"mal_id": doc.mal_id}

        let response = {
            success: false,
            operation: null,
            id: null
        };

        const existing = await collection.findOne(filter);
        if (existing) {
            const queryResult = await collection.findOneAndReplace(filter, doc);
            response = {
                success: queryResult.lastErrorObject.updatedExisting,
                operation: "update",
                id: queryResult.value._id
            };
        } else {
            const queryResult = await collection.insertOne(doc);
            response = {
                success: queryResult.acknowledged,
                operation: "insert",
                id: queryResult.insertedId
            };
        }
        return response;
    } finally {
        await client.close();
    }
}

// INSERT DATA FROM BATCH REQUEST
async function insertBatchData(category, docs) {
    try {
        await client.connect();
        const database = client.db(process.env.DB_NAME);
        const collection = database.collection(category);

        let response = {
            success: false,
            operation: null,
            ids: null
        };

        const existingIds = await collection.distinct("mal_id");
        const toUpdate = [];
        const toInsert = [];
        docs.forEach(doc => {
            if (existingIds.includes(doc.mal_id)) {
                toUpdate.push(doc);
            } else {
                toInsert.push(doc);
            }
        });

        console.log(existingIds);
        console.log(toUpdate.length, toInsert.length);

        if (toUpdate.length > 0) {
            const succeded = [];
            const failed = [];
            for (let i=0; i < toUpdate.length; i++) {
                const doc = toUpdate[i];
                const queryResult = await collection.updateOne({mal_id: doc.mal_id}, {$set: doc});
                if (queryResult.acknowledged) {
                    succeded.push(queryResult.upsertedId ?? doc.mal_id);
                } else {
                    failed.push(queryResult.upsertedId ?? doc.mal_id);
                }
            };
            response = {
                operation: "update",
                success: succeded,
                fail: failed
            };
        }
        if (toInsert.length > 0) {
            const queryResult = await collection.insertMany(docs);
            response = {
                operation: "insert",
                success: queryResult.acknowledged,
                ids: queryResult.insertedIds
            };
        }
        return response;
    } finally {
        await client.close();
    }
}

const availableCategories = ["anime", "characters", "manga"];

// SINGLE REQUEST
app.get("/:category/:id", (req, res) => {
    const category = req.params.category.toLowerCase();
    if (availableCategories.includes(category)) {
        const current = category.toUpperCase() + ": " + req.params.id + ": ";
        Jikan.get(category + "/" + req.params.id).then(async ({status, data}) => {
            if ("data" in data) {
                console.log(current + status);
                const response = await insertSingleData(category, data.data).catch(console.dir);
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
    } else {
        console.log("Unknown category");
        response = {
            status_code: 400,
            error: "Unknown category!"
        };
        res.status(400);
        res.send(response);
    }
});

// BATCH REQUEST
app.get("/batch/:category/:page", (req, res) => {
    const category = req.params.category.toLowerCase();
    if (availableCategories.includes(category)) {
        const current = category.toUpperCase() + " PAGE: " + req.params.page + ": ";
        Jikan.get(category + "?page=" + req.params.page).then(async ({status, data}) => {
            if ("data" in data && "pagination" in data) {
                console.log(current + status);
                const dbRS = await insertBatchData(category, data.data).catch(console.dir);
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
    } else {
        console.log("Unknown category");
        response = {
            status_code: 400,
            error: "Unknown category!"
        };
        res.status(400);
        res.send(response);
    }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => {console.log("Server running!")});