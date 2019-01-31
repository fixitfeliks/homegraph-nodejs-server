var express = require('express');

var app = express();

app.use(express.static('public'));


app.get('/node/', function (req, res) {
    var message = req.Headers;
    res.send(message);
})

var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})
