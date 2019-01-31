var express = require('express');

var app = express();

app.use(express.static('public'));

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};


app.get('/node/', function (req, res) {
    var message =
JSON.stringify(req, getCircularReplacer());;
    res.send(message);
})

var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
})
