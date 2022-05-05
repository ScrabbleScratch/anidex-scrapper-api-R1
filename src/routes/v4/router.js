const express = require('express');
const router = express.Router();
const v4 = require('../../controllers/v4.controller');

router.get('/:category', v4.category_ids);                      // GET mal_id'S REQUEST
router.get("/:category/info", v4.category_info);                // GET AVAILABLE CATEGORY INFO
router.get("/:category/:id", v4.category_element);              // GET SINGLE ELEMENT
router.get("/:category/:id/:info", v4.category_element_info);   // GET ADDITIONAL INFO ABOUT AN ELEMENT

module.exports = router;