'use strict';

var koa = require('koa');
var app = koa();
var route = require('koa-route');
var handlebars = require('koa-handlebars')
var send = require('koa-send');
var flickrLoader = require('./flickr-photo-loader');
var flickrConfig = require('./flickr-config');
var fs = require('fs');

deletePartiallyLoadedFileIfFound();
 
app.use(handlebars({
  defaultLayout: "main"
})); 
 
app.use(route.get('/feed', providePhoto));
app.use(route.get('/viewer', showViewer));

function *providePhoto(next) {
  yield send(this, 'images/next.jpg');
  yield next;
  fetchNextPhoto();
}

function *showViewer() {
  yield this.render("viewer", {
    title: "Test Page 2",
    name: "Worldy"
  });
}

function fetchNextPhoto() {
  if(!nextFileIsBeingLoaded()) {
    console.log("Looks like we need a new picture");
    flickrLoader.retrieveNextPhoto(flickrConfig);
  } else {
    console.log("Next picture already being loaded.  Let's be patient.");
  }
}

function nextFileIsBeingLoaded() {
  var nextNextFileExists = true;
  try {
    var a = fs.accessSync('images/next_next.jpg', fs.F_OK);
    console.log('Found next_next');
  } catch(err) {
    nextNextFileExists = false;
  }
  
  return nextNextFileExists;
  
}

function deletePartiallyLoadedFileIfFound() {
  if(nextFileIsBeingLoaded()) {
    fs.unlinkSync('.images/next_next.jpg');
  }
}

app.listen(8080,null,null,function() { console.log('Started sharing photos on process #' + process.pid);});

