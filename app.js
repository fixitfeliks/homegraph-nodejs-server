var express = require('express');
var expressip = require('express-ip');

var app = express();

app.use(expressip().getIpInfoMiddleware);
app.use(express.static('public'));


app.get('/node/', function (req, res) {
  const ipInfo = req.ipInfo;
  var message = 'your IP is: ' + req.connection.remoteAddress;
  res.send(message);
})

var server = app.listen(3000, function () {
    var port = server.address().port

    console.log("Example app listening on port:%s", port)
})
