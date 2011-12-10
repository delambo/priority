
var express = require('express'),
  port = 3000,
  app = express.createServer(),
  mvc = require(__dirname + '/../lib/index');
  
mvc.boot({
  app: app,
  dir: __dirname + '/app',
  render: {
    vendor: require('ejs'),
    ext: '.html',
    engine: 'html'
  }
});

// Set development specific handling
app.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Set production specific handling
app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.listen(port);

console.log('Express app started on port ' + port + ', in ' + app.settings.env + ' environment');