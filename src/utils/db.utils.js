const client = require('../config/dbConnection.config');
const {DB_NAME} = require('../config/variables.config');

// CHECK EXISTANCE OF AN ENTRY WITHIN DATABASE
async function checkExistance(version, collectionName, id, dbName) {
    try {
        await client.connect();
        const database = client.db(dbName ?? (DB_NAME + "_" + version));
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
async function getIds(version, collectionName, dbName) {
    let response = {
        success: false,
        database: null,
        collection: null,
        operation: null,
        data: null
    };
    try {
        await client.connect()
        const database = client.db(dbName ?? (DB_NAME + "_" + version));
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

// INSERT DATA to DB FROM REQUEST
async function insertDoc(version, collectionName, id, doc, dbName) {
    let response = {
        success: false,
        database: null,
        collection: null,
        operation: null,
        id: null
    };
    try {
        await client.connect();
        const database = client.db(dbName ?? (DB_NAME + "_" + version));
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

module.exports = {checkExistance, getIds, insertDoc};