var express = require('express');
var geoip = require('geo-from-ip');
var mustacheExpress = require('mustache-express');

var app = express();

app.engine('html', mustacheExpress());
app.set('view agent','html');
app.set('views',__dirname + 'public');

app.use(express.static('public'));

app.get('/node/', function (req, res) {
  //const ipInfo = req.ipInfo;
  //var message = 'your IP is: ' + req.connection.remoteAddress;
  //var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
  //res.send(JSON.stringify(req.headers,null,4) + "\n" + JSON.stringify(geoip.allData(req.headers["x-real-ip"]),null, 4));
  res.render('index.html',{"object":"HIII"});
})

var server = app.listen(3000, function () {
    var port = server.address().port

    console.log("Example app listening on port:%s", port)
})
