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

// CHECK EXISTANCE OF AN ENTRY WITHIN DATABASE
async function checkExistance(version, collectionName, id, dbName) {
    try {
        await client.connect();
        const database = client.db(dbName ?? (process.env.DB_NAME + "_" + version));
        const collection = database.collection(collectionName);

        const filter = {"mal_id": parseInt(id)};

        const result = await collection.findOne(filter);
        
        if (result) {
            return true;
        } else {
            return false;
        }
    } finally {
        await client.close();
    }
}

// GET ALL mal_id IN A COLLECTION
async function getMALIds(version, collectionName, dbName) {
    let response = {
        success: false,
        database: null,
        collection: null,
        operation: null,
        data: null
    };
    try {
        await client.connect()
        const database = client.db(dbName ?? (process.env.DB_NAME + "_" + version));
        const collection = database.collection(collectionName);

        const existingIds = await collection.distinct("mal_id");

        response = {
            success: true,
            database: database.databaseName,
            collection: collection.collectionName,
            operation: 'find',
            data: existingIds
        };
    } finally {
        await client.close();
    }
    return response;
}

// INSERT DATA FROM SINGLE REQUEST
async function insertSingleData(version, collectionName, id, doc, dbName) {
    let response = {
        success: false,
        database: null,
        collection: null,
        operation: null,
        id: null
    };
    try {
        await client.connect();
        const database = client.db(dbName ?? (process.env.DB_NAME + "_" + version));
        const collection = database.collection(collectionName);

        const filter = {"mal_id": parseInt(id)};

        const existing = await collection.findOne(filter);

        doc.mal_id = parseInt(id);
        if (existing) {
            const queryResult = await collection.findOneAndUpdate(filter, {$set: doc});
            response = {
                success: queryResult.lastErrorObject.updatedExisting,
                database: database.databaseName,
                collection: collection.collectionName,
                operation: "update",
                id: queryResult.value._id
            };
        } else {
            const queryResult = await collection.insertOne(doc);
            response = {
                success: queryResult.acknowledged,
                database: database.databaseName,
                collection: collection.collectionName,
                operation: "insert",
                id: queryResult.insertedId
            };
        }
    } finally {
        await client.close();
    }
    return response;
}

// INSERT DATA FROM BATCH REQUEST
async function insertBatchData(version, collectionName, docs, dbName) {
    let response = [];
    try {
        await client.connect();
        const database = client.db(dbName ?? (process.env.DB_NAME + "_" + version));
        const collection = database.collection(collectionName);

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

        // console.log(existingIds);
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
            response.push({
                operation: "update",
                success: succeded,
                fail: failed
            });
        }
        if (toInsert.length > 0) {
            const queryResult = await collection.insertMany(toInsert);
            response.push({
                operation: "insert",
                success: queryResult.acknowledged,
                ids: queryResult.insertedIds
            });
        }
    } finally {
        await client.close();
    }
    return response;
}

const availableVersions = {
    v3: {
        anime: [],
        character: [],
        manga: []
    },
    v4: {
        anime: ["characters", "staff", "pictures", "statistics", "recommendations", "relations", "themes", "external"],
        characters: ["anime", "manga", "voices", "pictures"],
        manga: ["characters", "pictures", "statistics", "recommendations", "relations", "external"]
    }
};

// GET mal_id'S REQUEST
app.get("/:version/:category", async (req, res) => {
    let response;
    const version = req.params.version;
    if (version in availableVersions) {
        const category = req.params.category.toLowerCase();
        if (category in availableVersions[version]) {
            const db = req.query.db;
            const collection = req.query.collection ?? category;
            const response = await getMALIds(version, collection, db);
            const current = category.toUpperCase() + ": IDS: " + response.data.length;
            console.log(current);
            res.send(response);
        } else {
            console.log("Unknown category");
            response = {
                success: false,
                status_code: 400,
                error: "Unknown category!"
            };
            res.status(response.status_code);
        }
    } else {
        console.log("Unknown version");
        response = {
            success: false,
            status_code: 400,
            error: "Unknown version!"
        };
        res.status(response.status_code);
    }
    res.send(response);
});

// GET AVAILABLE CATEGORY INFO
app.get("/:version/:category/info", async (req, res) => {
    let response;
    const version = req.params.version;
    if (version in availableVersions) {
        const category = req.params.category.toLowerCase();
        if (category in availableVersions[version]) {
            const current = category.toUpperCase() + ": INFO: " + availableVersions[version][category].length;
            console.log(current);
            response = {
                success: true,
                data: availableVersions[version][category]
            }
        } else {
            console.log("Unknown category");
            response = {
                success: false,
                status_code: 400,
                error: "Unknown category!"
            };
            res.status(response.status_code);
        }
    } else {
        console.log("Unknown version");
        response = {
            success: false,
            status_code: 400,
            error: "Unknown version!"
        };
        res.status(response.status_code);
    }
    res.send(response);
});

// SINGLE REQUESTS
app.get("/:version/:category/:id", async (req, res) => {
    let response;
    const version = req.params.version;
    if (version in availableVersions) {
        const category = req.params.category.toLowerCase();
        if (category in availableVersions[version]) {
            const id = req.params.id;
            const db = req.query.db;
            const collection = req.query.collection ?? category;
            const current = category.toUpperCase() + ": " + id + ": ";
            await Jikan.get(version+"/"+category+"/"+id).then(async ({status, data}) => {
                if (version === "v3" && "mal_id" in data) {
                    console.log(current + status);
                    response = await insertSingleData(version, collection, id, data, db).catch(console.dir);
                    response.data = data;
                    res.status(status);
                } else if (version === "v4" && "data" in data) {
                    console.log(current + status);
                    response = await insertSingleData(version, collection, id, data.data, db).catch(console.dir);
                    response.data = data.data;
                    res.status(status);
                } else {
                    if ("status" in data) {
                        console.log(current + data.status);
                        res.status(data.status);
                    } else {
                        console.log(current + 501);
                        res.status(501);
                    }
                    response = data;
                }
            }).catch((err) => {
                if (err.response) {
                    console.log(current + err.response.status);
                    res.status(err.response.status);
                    response = err.response.data;
                } else {
                    console.log(err);
                    res.status(400);
                    response = err;
                }
            });
        } else {
            console.log("Unknown category");
            response = {
                success: false,
                status_code: 400,
                error: "Unknown category!"
            };
            res.status(response.status_code);
        }
    } else {
        console.log("Unknown version");
        response = {
            success: false,
            status_code: 400,
            error: "Unknown version!"
        };
        res.status(response.status_code);
    }
    res.send(response);
});

app.get("/:version/:category/:id/:info", async (req, res) => {
    let response;
    const version = req.params.version;
    if (version in availableVersions) {
        const category = req.params.category.toLowerCase();
        if (category in availableVersions[version]) {
            const info = req.params.info;
            if (availableVersions[version][category].includes(info)) {
                const id = req.params.id;
                const db = req.query.db;
                const collection = req.query.collection ?? category;
                const docName = req.query.name;
                if (await checkExistance(version, req.query.check_in ?? collection, id, db)) {
                    const current = category.toUpperCase() + ": " + info.toUpperCase() + ": " + id + ": ";
                    await Jikan.get(version+"/"+category+"/"+id+"/"+info).then(async ({status, data}) => {
                        if (version === "v4" && "data" in data) {
                            console.log(current + status);
                            const doc = {
                                [docName ?? (info+"_data")]: data.data
                            }
                            response = await insertSingleData(version, collection, id, doc, db).catch(console.dir);
                            response.data = doc;
                            res.status(status);
                        } else {
                            if ("status" in data) {
                                console.log(current + data.status);
                                res.status(data.status);
                            } else {
                                console.log(current + 501);
                                res.status(501);
                            }
                            response = data;
                        }
                    }).catch((err) => {
                        if (err.response) {
                            console.log(current + err.response.status);
                            res.status(err.response.status);
                            response = err.response.data;
                        } else {
                            console.log(err);
                            res.status(400);
                            response = err;
                        }
                    });
                } else {
                    console.log("Id not found in DB");
                    response = {
                        success: false,
                        status_code: 406,
                        error: "Id not found within database. Add it before requesting details!"
                    };
                    res.status(response.status_code);
                }
            } else {
                console.log("Unknown info");
                response = {
                    success: false,
                    status_code: 400,
                    error: "Unknown info!"
                };
                res.status(response.status_code);
            }
        } else {
            console.log("Unknown category");
            response = {
                success: false,
                status_code: 400,
                error: "Unknown category!"
            };
            res.status(response.status_code);
        }
    } else {
        console.log("Unknown version");
        response = {
            success: false,
            status_code: 400,
            error: "Unknown version!"
        };
        res.status(response.status_code);
    }
    res.send(response);
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, () => {console.log("Server running!")});

// EXPORT EXPRESS API
module.exports = app;