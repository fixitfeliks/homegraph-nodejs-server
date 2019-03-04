 var express = require('express');
var mustacheExpress = require('mustache-express');
var geoip = require('geoip-lite');
var AWS = require('aws-sdk');
const bodyParser = require('body-parser');

AWS.config.update({
  region: "us-east-1"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var app = express();

app.engine('html', mustacheExpress());
app.set('view agent','html');
app.set('views',__dirname + '/public');

app.use(express.static('public/images'));
app.use('/login',express.static('public/login.html'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

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



app.post('/login', function(req,res){
  console.log(req.body.email, ' , ' , req.body.password);
});

app.get('/dynamo', function(req,res) {
  var TS = new Date().toISOString();
  var geo = geoip.lookup(req.headers["x-real-ip"]);
  var params = {
    TableName:"visitor_log",
    Item:{
        "data_type": "ip",
        "time_stamp": TS,
        "ip": req.headers["x-real-ip"],

        "user_agent":req.headers["user-agent"],"referer":req.headers.referer,
        "accept_language":req.headers["accept-language"],"region":geo.region,
        "city":geo.city,"country":geo.country,
        "ll":geo.ll,"timezone":geo.timezone
    }
  };
  var params2 = {
    TableName:"visitor_log",
    ScanIndexForward: "false",
    Limit:10,
    KeyConditionExpression: "#type = :tttt",
    ExpressionAttributeNames:{
        "#type": "data_type"
    },
    ExpressionAttributeValues: {
        ":tttt": "ip"
    }
  };
  docClient.put(params, function(err, data) {
    if (err) {
        res.send(JSON.stringify(err));
    }else{
       docClient.query(params2, function(err,data) {res.send(JSON.stringify(data))});
    }
  });

});

/*
*   Start Google HomeGraph API
*/
app.get('/oauth', function(req, res) {
  let clientId = req.query.client_id;
  let redirectUri = req.query.redirect_uri;
  let state = req.query.state;
  let responseType = req.query.response_type;
  console.log(clientId,redirectUri,state,responseType);
  res.send("HI");
});


var server = app.listen(3000, function () {
    var port = server.address().port

    console.log("listening on port...%s", port)
});
