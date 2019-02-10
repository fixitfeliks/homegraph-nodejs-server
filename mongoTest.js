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
  req.headers.referer = (req.headers.referer != undefined) ? req.headers.referer : 'Direct';
  res.render('node.html',
             {"IP":req.headers["x-real-ip"],"user-agent":req.headers["user-agent"],"referer":req.headers.referer,
              "accept-language":req.headers["accept-language"],
              "TS":TS
            });
});


// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
    var log_db = db.db("visitor_log");
    const cursor = log_db.collection('test').find({});
    cursor.each(function(err, doc){
        if (err)  throw(err);
        console.log(doc);
    })
  db.close();
});

var server = app.listen(3003, function () {
    var port = server.address().port

    console.log("listening on port...%s", port)
});
