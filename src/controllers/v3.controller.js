const {v3} = require('../config/versions.config');
const {getIds, insertDoc} = require('../utils/db.utils');
const Jikan = require('../config/Jikan.config');

exports.category_ids = async (req, res) => {
    let response;
    const category = req.params.category.toLowerCase();
    if (category in v3) {
        const db = req.query.db;
        const collection = req.query.collection ?? category;
        response = await getIds('v3', collection, db);
        const current = category.toUpperCase() + ": IDS: " + response.data.length;
        console.log(current);
    } else {
        console.log("Unknown category");
        response = {
            success: false,
            status_code: 400,
            error: "Unknown category!"
        };
        res.status(response.status_code);
    }
    res.send(response);
};

exports.category_info = async (req, res) => {
    let response;
    const category = req.params.category.toLowerCase();
    if (category in v3) {
        const current = category.toUpperCase() + ": INFO: " + v3[category].length;
        console.log(current);
        response = {
            success: true,
            operation: 'check',
            data: v3[category]
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
    res.send(response);
};

exports.category_element = async (req, res) => {
    let response;
    const category = req.params.category.toLowerCase();
    if (category in v3) {
        const id = req.params.id;
        const db = req.query.db;
        const collection = req.query.collection ?? category;
        const current = category.toUpperCase() + ": " + id + ": ";
        await Jikan.get("v3/"+category+"/"+id).then(async ({status, data}) => {
            if ("mal_id" in data) {
                console.log(current + status);
                response = await insertDoc('v3', collection, id, data, db).catch(console.dir);
                response.data = data;
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
    res.send(response);
};