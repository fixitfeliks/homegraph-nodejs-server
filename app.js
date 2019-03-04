require('dotenv').config();
const express = require('express');
const mustacheExpress = require('mustache-express');
const geoip = require('geoip-lite');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const util = require('util');

const userName = 'user@test.com';
const userPassword = 'test';
let userToken = undefined;

AWS.config.update({
  region: "us-east-1"
});

const docClient = new AWS.DynamoDB.DocumentClient();

const app = express();

app.engine('html', mustacheExpress());
app.set('view agent', 'html');
app.set('views', __dirname + '/public');

app.use(express.static('public/images'));
app.use('/login', express.static('public/login.html'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
  //const ipInfo = req.ipInfo;
  //var message = 'your IP is: ' + req.connection.remoteAddress;
  //var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
  //res.send(JSON.stringify(req.headers,null,4) + "\n" + JSON.stringify(geoip.allData(req.headers["x-real-ip"]),null, 4));

  let geo = geoip.lookup(req.headers["x-real-ip"]);
  let TS = new Date().toISOString();
  req.headers.referer = (req.headers.referer != undefined) ? req.headers.referer : 'Direct';
  res.render('node.html', {
    "IP": req.headers["x-real-ip"],
    "user-agent": req.headers["user-agent"],
    "referer": req.headers.referer,
    "accept-language": req.headers["accept-language"],
    "region": geo.region,
    "city": geo.city,
    "country": geo.country,
    "ll": geo.ll,
    "timezone": geo.timezone,
    "TS": TS
  });
  // var geoSON = JSON.stringify(geoip.allData(req.headers["x-real-ip"]).code);
  // res.send(geoSON);
});

app.get('/dynamo', function(req, res) {
  let TS = new Date().toISOString();
  let geo = geoip.lookup(req.headers["x-real-ip"]);
  let params = {
    TableName: "visitor_log",
    Item: {
      "data_type": "ip",
      "time_stamp": TS,
      "ip": req.headers["x-real-ip"],

      "user_agent": req.headers["user-agent"],
      "referer": req.headers.referer,
      "accept_language": req.headers["accept-language"],
      "region": geo.region,
      "city": geo.city,
      "country": geo.country,
      "ll": geo.ll,
      "timezone": geo.timezone
    }
  };
  let params2 = {
    TableName: "visitor_log",
    ScanIndexForward: "false",
    Limit: 10,
    KeyConditionExpression: "#type = :tttt",
    ExpressionAttributeNames: {
      "#type": "data_type"
    },
    ExpressionAttributeValues: {
      ":tttt": "ip"
    }
  };
  docClient.put(params, function(err, data) {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      docClient.query(params2, function(err, data) {
        res.send(JSON.stringify(data))
      });
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
  let authCode = req.query.code;



  console.log(clientId, redirectUri, state, req.path, responseType,authCode);
  if (clientId === process.env.GOOGLE_REQ_ID) {
    if(!authCode){
      s.redirect(util.format(
        '/login?client_id=%s&redirect_uri=%s&redirect=%s&state=%s',
        clientId, encodeURIComponent(redirectUri), req.path, state));
    }
  } else {
    res.send(401);
  }
});


app.post('/login', function(req, res) {
  console.log(req.body.email, req.body.password, req.body.client_id,
    req.body.redirect_uri, req.body.redirect, req.body.state);

  if (userName === (req.body.email).toLowerCase() && userPassword === req.body.password){
    userToken = genRandomString();
    console.log(util.format('%s?access_token=%s&token_type=bearer&state=%s&code=SUCCES',
      decodeURIComponent(req.body.redirect_uri), userToken, req.body.state));
    res.redirect(util.format('%s?access_token=%s&token_type=bearer&state=%s&code=SUCCES',
      decodeURIComponent(req.body.redirect_uri), userToken, req.body.state));
  }
  else{
    res.sendStatus(401);
  }
});



app.post('/smarthome', function(request, response) {
  console.log('post /smarthome headers', request.headers);
  let reqdata = request.body;
  console.log('post /smarthome body', reqdata);
});

function genRandomString() {
  return Math.floor(Math.random() *
      1000000000000000000).toString(36);
}

const server = app.listen(3000, function() {
  let port = server.address().port

  console.log("listening on port...%s", port)
});
