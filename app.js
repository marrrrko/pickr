'use strict';

var koa = require('koa');
var app = koa();
var route = require('koa-route');
var handlebars = require('koa-handlebars')
var send = require('koa-send');
var flickrLoader = require('./flickr-photo-loader');
var flickrConfig = require('./flickr-config');
var fs = require('fs');
var winston = require('winston');
var http = require('http')
winston.add(winston.transports.File, { filename: 'piframe.log' });

configureCouchLoggingIfPossible().then(startThingsUp);

function startThingsUp() {
  deletePartiallyLoadedFileIfFound();
 
  app.use(handlebars({
    defaultLayout: "main"
  })); 
 
  app.use(route.get('/feed', providePhoto));
  app.use(route.get('/viewer', showViewer));
  app.use(route.get('/info', showInfo));
}

function *providePhoto(next) {
  try {
    yield send(this, 'images/next.jpg');
    yield next;
  } catch(err) {
    winston.error("Failed to serve up next.jpg: " + err);
    yield next;
  }
  try {
    fetchNextPhoto();
  } catch(err) {
    winston.error('Failed to fetch next photo: ' + err);
  }
}

function *showViewer() {
  yield this.render("viewer", {
    title: "Test Page 2",
    name: "Worldy"
  });
}

function *showInfo() {
  this.body = 'Piframe is up!'
}

function fetchNextPhoto() {
  if(!nextFileIsBeingLoaded()) {
    winston.info("Looks like we need a new picture");
    flickrLoader.retrieveNextPhoto(flickrConfig);
  } else {
    winston.info("Next picture already being loaded.  Let's be patient.");
  }
}

function nextFileIsBeingLoaded() {
  var nextNextFileExists = true;
  try {
    var a = fs.accessSync('images/next_next.jpg', fs.F_OK);
    winston.debug('Found next_next');
  } catch(err) {
    nextNextFileExists = false;
  }
  
  return nextNextFileExists;
  
}

function deletePartiallyLoadedFileIfFound() {
  if(nextFileIsBeingLoaded()) {
    fs.unlinkSync('./images/next_next.jpg');
  }
}

function configureCouchLoggingIfPossible() {
  return new Promise((resolve, reject) => { 
    var options = {
      host: 'localhost',
      port: 5984,
      path: '/'
    }
    
    http.get(options, function(resp){
      resp.on('data', function(chunk){
        var winstonCouch = require('winston-couchdb').Couchdb
        winston.add(winstonCouch, {
          auth: {username: 'admin', password: 'piframe'}
        })
        winston.info("Couch logging activamated.")
        resolve();
      });
    }).on("error", function(e){
      winston.info("Couch didn't seem available so no couch logging")
    });
  });
}

var port = process.env.PORT;
if(!port)
  port = 8080;
  
app.listen(port,null,null,function() { winston.info('Process #' + process.pid + ' started sharing photos on port ' + port);});

