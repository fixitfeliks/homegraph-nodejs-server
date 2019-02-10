var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var mustacheExpress = require('mustache-express');
// Connection URL
var url = 'mongodb://admin:conair123@localhost:27017/';

var app = express();

app.engine('html', mustacheExpress());
app.set('view agent','html');
app.set('views',__dirname + '/public');

app.use(express.static('public'));

app.get('/', function (req, res) {
  var TS = new Date().toISOString();
  let tmp = {"IP":req.headers["x-real-ip"],"user-agent":req.headers["user-agent"],
  "referer":req.headers.referer,"accept-language":req.headers["accept-language"],
   "TS":TS}
  req.headers.referer = (req.headers.referer != undefined) ? req.headers.referer : 'Direct';
  res.render('node.html', tmp);

  (async function() {
        try {
            const client = new MongoClient(url);
            await client.connect();
            const log_db = client.db("visitor_log");
            let r = await log_db.collection('test').insertOne(tmp);
            console.log(r);
        } catch (err) {
            console.log(err.stack);
        }
    })();
});

app.get('/getVisitorsLog' ,function (req, res) {
  (async function() {
      try {
          const client = new MongoClient(url);
          await client.connect();
          const log_db = client.db("visitor_log");
          let r = await log_db.collection('test').find({});
          let out = [];
          r.toArray(function(err, doc){
              if (err) throw (err);
              res.send(doc);
          });

      } catch (err) {
          console.log(err.stack);
      }
  })();
});


var server = app.listen(3003, function () {
    var port = server.address().port

    console.log("listening on port...%s", port)
});
