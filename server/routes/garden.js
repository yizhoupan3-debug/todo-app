const express = require('express');
const router = express.Router();
const db = require('../db');
const shared = require('./garden-shared');

require('./garden-coins')(router, { db, ...shared });
require('./garden-plots')(router, { db, ...shared });
require('./garden-expeditions')(router, { db, ...shared });

module.exports = router;
