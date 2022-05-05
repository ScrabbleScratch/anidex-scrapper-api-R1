const express = require('express');
const router = express.Router();
const v3 = require('../../controllers/v3.controller');

router.get('/:category', v3.category_ids);          // GET mal_id'S REQUEST
router.get("/:category/info", v3.category_info);    // GET AVAILABLE CATEGORY INFO
router.get("/:category/:id", v3.category_element);  // GET SINGLE ELEMENT

module.exports = router;