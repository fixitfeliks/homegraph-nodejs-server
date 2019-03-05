require('dotenv').config();
const express = require('express');
const mustacheExpress = require('mustache-express');
const geoip = require('geoip-lite');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const util = require('util');

const User = {};
User.name = 'user@test.com';
User.password = 'test';
User.authCode = undefined;
User.expiresAt = undefined
User.accessToken = undefined;
User.refreshToken = undefined;

function setDevice(device, req){
  return {
      requestId: req.requestId,
      payload: {
        agentUserId: '1234',
        devices: [device]
      }
  };
}

const lightDevice = {
  id: '0',
    type: 'action.devices.types.LIGHT',
    traits: [
      'action.devices.traits.OnOff',
      'action.devices.traits.Brightness',
      'action.devices.traits.ColorSpectrum'],
    name:{
      defaultNames: ['SmartLight'],
      name:'Smart Light 0',
      nicknames: ['Feliks Light']},
      willReportState: false,
      roomHint: '',
      deviceInfo: {
      manufacturer: 'Phosphr Cloud',
      model:'fp1337',
      swVersion: '0.0.1',
      hwVersion: '0.1.0'},
    customData: { smartHomeProviderId: 'TESTFelix'}
  }


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
      res.redirect(util.format(
        '/login?client_id=%s&redirect_uri=%s&redirect=%s&state=%s',
        clientId, encodeURIComponent(redirectUri), req.path, state));
    }
  } else {
    res.send(401);
  }
});


app.post('/login', function(req, res) {

  if (User.name === (req.body.email).toLowerCase() && User.password === req.body.password){
    User.authCode = genRandomString();
    User.expiresAt = new Date(Date.now() + (60 * 10000));

    res.redirect(util.format('%s?code=%s&state=%s',
      decodeURIComponent(req.body.redirect_uri), User.authCode, req.body.state));
  }
  else{
    res.sendStatus(401);
  }
});

app.all('/token', function(req, res) {
  console.log('/token query', req.query);
  console.log('/token header',req.headers);
  console.log('/token body', req.body);

  let clientId = req.query.client_id
      ? req.query.client_id : req.body.client_id;
  let clientSecret = req.query.client_secret
      ? req.query.client_secret : req.body.client_secret;
  let grantType = req.query.grant_type
      ? req.query.grant_type : req.body.grant_type;

  if (clientId === process.env.GOOGLE_REQ_ID && clientSecret === process.env.GOOGLE_REQ_SECRET) {
    if ('authorization_code' == grantType) {
      return handleAuthCode(req, res);
    } else if ('refresh_token' == grantType) {
      return handleRefreshToken(req, res);
    } else {
      console.error('grant_type ' + grantType + ' is not supported');
      return res.status(400)
          .send('grant_type ' + grantType + ' is not supported');
    }
  }else{
    console.error('missing required parameter');
    return res.status(400).send('missing required parameter');
  }
});

function handleAuthCode(req, res) {
  console.log('handleAuthCode', req.query);

  let clientId = req.query.client_id
      ? req.query.client_id : req.body.client_id;
  let clientSecret = req.query.client_secret
      ? req.query.client_secret : req.body.client_secret;
  let code = req.query.code ? req.query.code : req.body.code;console.log("Hi");

  if (!code) {
    console.error('missing required parameter');
    return res.status(400).send('missing required parameter');
  }

  if (!User.authCode) {
    console.error('invalid code');
    return res.status(400).send('invalid code');
  }

  if (new Date(User.expiresAt) < Date.now()) {
    console.error('expired code');
    return res.status(400).send('expired code');
  }
  if (clientId != process.env.GOOGLE_REQ_ID) {
    console.error('invalid code - wrong client');
    return res.status(400).send('invalid code - wrong client');
  }

  let token = getAccessToken(User);

  if (!token) {
    console.error('unable to generate a token', token);
    return res.status(400).send('unable to generate a token');
  }

  console.log('respond success', token);
  return res.status(200).json(token);
}
  function getAccessToken(user){
    let authCode = user.authCode;

    if (!authCode) {
      console.error('invalid code');
      return false;
    }

    if (new Date(user.expiresAt) < Date.now()) {
      console.error('expired code');
      return false;
    }

    user.accessToken = genRandomString();
    user.refreshToken = genRandomString();

    let returnToken = {
      token_type: 'bearer',
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
      expires_in:600
    };

    console.log('return getAccessToken = ', returnToken);
    return returnToken;
  }

  function handleRefreshToken(req, res) {
    let clientId = req.query.client_id
        ? req.query.client_id : req.body.client_id;
    let clientSecret = req.query.client_secret
        ? req.query.client_secret : req.body.client_secret;
    let refreshToken = req.query.refresh_token
        ? req.query.refresh_token : req.body.refresh_token;

    if (!(clientId === process.env.GOOGLE_REQ_ID) || !(clientSecret === process.env.GOOGLE_REQ_SECRET)) {
      console.error('invalid client id or secret %s, %s',
          clientId, clientSecret);
      return res.status(500).send('invalid client id or secret');
    }

    if (!refreshToken) {
      console.error('missing required parameter');
      return res.status(500).send('missing required parameter');
    }

    res.status(200).json({
      token_type: 'bearer',
      access_token: refreshToken,
    });
  }

  app.post('/smarthome', function(req, res) {
    console.log('post /smarthome headers', req.headers);
    let reqdata = req.body;
    console.log('post /smarthome body', reqdata);

    for (let i = 0; i < reqdata.inputs.length; i++) {
      let input = reqdata.inputs[i];
      let intent = input.intent;
      if (!intent) {
        response.status(401).set({
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }).json({error: 'missing inputs'});
        continue;
      }

      switch (intent) {
        case 'action.devices.SYNC':
        let deviceProps = {
          requestId: reqdata.requestId,
          payload: {
            agentUserId: '1234',
            devices: []
          }
        };
        console.log('sync response', JSON.stringify(setDevice(lightDevice,reqdata)));
        res.status(200).json(setDevice(lightDevice,reqdata));
        break;
      }
    }
  });

function registerDevice(){
  let authToken = User.accessToken;
  let uid = "1234";


}

function genRandomString() {
  return Math.floor(Math.random() *
      1000000000000000000).toString(36);
}

const server = app.listen(3000, function() {
  let port = server.address().port

  console.log("listening on port...%s", port)
});
