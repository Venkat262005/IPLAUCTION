const mongoose = require('mongoose');
const Franchise = require('./server/models/Franchise.js');
require('dotenv').config({ path: './server/.env' });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const teams = await Franchise.find().lean();
        console.log("DB Teams:");
        console.dir(teams);
        process.exit(0);
    })
    .catch(console.error);
