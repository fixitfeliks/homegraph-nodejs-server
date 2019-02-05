var express = require('express');
var mustacheExpress = require('mustache-express');
var geoip = require('geoip-lite');
var AWS = require('aws-sdk');

AWS.config.update({
  region: "us-east-2",
  endpoint: "https://dynamodb.us-east-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var app = express();

app.engine('html', mustacheExpress());
app.set('view agent','html');
app.set('views',__dirname + '/public');

app.use(express.static('public'));

app.get('/', function (req, res) {
  //const ipInfo = req.ipInfo;
  //var message = 'your IP is: ' + req.connection.remoteAddress;
  //var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
  //res.send(JSON.stringify(req.headers,null,4) + "\n" + JSON.stringify(geoip.allData(req.headers["x-real-ip"]),null, 4));
 
  var geo = geoip.lookup(req.headers["x-real-ip"]);
  var TS = new Date().toISOString();
  req.headers.referer = (req.headers.referer != undefined) ? req.headers.referer : 'Direct';
  res.render('node.html',
             {"IP":req.headers["x-real-ip"],"user-agent":req.headers["user-agent"],"referer":req.headers.referer,
              "accept-language":req.headers["accept-language"],"region":geo.region,"city":geo.city,"country":geo.country,
              "ll":geo.ll,"timezone":geo.timezone,"TS":TS
             }          
  );
 // var geoSON = JSON.stringify(geoip.allData(req.headers["x-real-ip"]).code);
 // res.send(geoSON);
});

app.get('/dynamo', function(req,res) {
  var TS = new Date().toISOString();
  var geo = geoip.lookup(req.headers["x-real-ip"]);
  var params = {
    TableName:"Visitor_History",
    Item:{
        "Time_Stamp": TS,
        "IP_Address": req.headers["x-real-ip"],"user-agent":req.headers["user-agent"],"referer":req.headers.referer,
              "accept-language":req.headers["accept-language"],"region":geo.region,"city":geo.city,"country":geo.country,
              "ll":geo.ll,"timezone":geo.timezone
    }
  };
  docClient.put(params, function(err, data) {
    if (err) {
        res.send(JSON.stringify(err));
    } else {
         doClient.scan(params);
    }
  });
});
var server = app.listen(3000, function () {
    var port = server.address().port

    console.log("Example app listening on port:%s", port)
});
