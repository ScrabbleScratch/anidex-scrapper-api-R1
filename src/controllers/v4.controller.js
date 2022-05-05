const {v4} = require('../config/versions.config');
const {checkExistance, getIds, insertDoc} = require('../utils/db.utils');
const Jikan = require('../config/Jikan.config');

exports.category_ids = async (req, res) => {
    let response;
    const category = req.params.category.toLowerCase();
    if (category in v4) {
        const db = req.query.db;
        const collection = req.query.collection ?? category;
        response = await getIds('v4', collection, db);
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
    if (category in v4) {
        const current = category.toUpperCase() + ": INFO: " + v4[category].length;
        console.log(current);
        response = {
            success: true,
            operation: 'check',
            data: v4[category]
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
    if (category in v4) {
        const id = req.params.id;
        const db = req.query.db;
        const collection = req.query.collection ?? category;
        const current = category.toUpperCase() + ": " + id + ": ";
        await Jikan.get("v4/"+category+"/"+id).then(async ({status, data}) => {
            if ("data" in data) {
                console.log(current + status);
                response = await insertDoc('v4', collection, id, data.data, db).catch(console.dir);
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
    res.send(response);
};

exports.category_element_info = async (req, res) => {
    let response;
    const category = req.params.category.toLowerCase();
    if (category in v4) {
        const info = req.params.info;
        if (v4[category].includes(info)) {
            const id = req.params.id;
            const db = req.query.db;
            const collection = req.query.collection ?? category;
            const docName = req.query.name;
            if (await checkExistance('v4', req.query.check_in ?? collection, id, db)) {
                const current = category.toUpperCase() + ": " + info.toUpperCase() + ": " + id + ": ";
                await Jikan.get("v4/"+category+"/"+id+"/"+info).then(async ({status, data}) => {
                    if ("data" in data) {
                        console.log(current + status);
                        const doc = {
                            [docName ?? (info+"_data")]: data.data
                        }
                        response = await insertDoc('v4', collection, id, doc, db).catch(console.dir);
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
    res.send(response);
};