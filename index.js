const express = require('express');
const app = express();

app.use(express.static('public'));

const server = app.listen(8080, function(){
    console.log("Node.js is listening to PORT:" + server.address().port);
});