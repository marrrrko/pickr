'use strict';

var koa = require('koa');
var app = koa();
var route = require('koa-route');
var handlebars = require('koa-handlebars')
var send = require('koa-send');
 
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
  console.log("Something");
}

app.listen(8080);

