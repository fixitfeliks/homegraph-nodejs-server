var express = require('express');

const expressip = require('express-ip');

var app = express();
app.use(expressip().getIpInfoMiddleware);

app.get('/', function (req, res) {
    const ipInfo = req.ipInfo;
    var message = `Hey, you are browsing from ${ipInfo.city}, ${ipInfo.country},' IP:', ${ipInfo.ip}`;
    res.send(message);
})

var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})
