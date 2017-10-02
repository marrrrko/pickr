'use strict'

var koa = require('koa')
var bodyparser = require('koa-bodyparser')
var app = new koa()
var routing = require('koa-router')
var serve = require('koa-static')
var handlebars = require('koa-handlebars')
var send = require('koa-send')
var flickrLoader = require('./flickr-photo-loader')
var config = require('config')
var fs = require('fs')
var winston = require('winston')
var http = require('http')
var os = require('os')

winston.add(winston.transports.File, { name: 'normal', filename: 'frame.log' })
winston.add(winston.transports.File, { name: 'errors', filename: 'errors.log',level: 'error' })

startThingsUp();

function startThingsUp() {
    winston.info("Getting things ready...")
    
    let router = setupRouting();
    app.use(handlebars({ defaultLayout: 'main' }));
    app.use(bodyparser());
    app.use(serve('./public'))
    app.use(router.routes())
    
    
    
    var port = process.env.PORT
    if(!port)
      port = 8080

    app.listen(port,null,null,function() { winston.info('Process #' + process.pid + ' started sharing photos on port ' + port)})
    winston.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
    getAPhoto();
}

function getAPhoto() {
  let aPhoto = undefined;
  flickrLoader
    .getAGoodPhoto(winston)
    .then(function(photo) { 
      aPhoto = photo; 
      console.log('GOT IT!!!')
    }).catch(err => {
      winston.err(err);
    });
}

async function providePhoto(ctx, next) {
  try {
    winston.info('A client has requested a photo.  System average cpu load is ' + os.loadavg() + '. Free memory: ' + Math.round(os.freemem()/1048576) + ' out of ' + Math.round(os.totalmem()/1048576) + 'MB.')   
    winston.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
    if(nextFileIsReady()) {
      winston.info('Looks like we have a new picture to serve')
      try {
        fs.renameSync("./images/next.jpg", "./images/current.jpg")
        winston.info('Next renamed to current')
      } catch(err) {
        winston.error("Failed to rename next to current: " + err)
      }
    } else {
      winston.warn('Looks like next file is not ready yet.  Slow poke')
    }
    
    await send(ctx, 'images/current.jpg')
    winston.info('Current.jpg served')
    await next
  } catch(err) {
    winston.error("Failed to provide a photo: " + err)
    await next
  }
}

function setupRouting() {
    let routerSettings = {}
    var prefix = config.get('prefix')
    if(prefix)
        routerSettings = { prefix: prefix }

    let router = new routing(routerSettings)
    router.get('/feed', providePhoto)
    router.get('/viewer', showViewer)
    router.get('/info', showInfo)
    router.post('/log', logClientMsg)
    
    return router;
}

async function showViewer(ctx) {
  winston.info('Viewer request')
  await ctx.render("viewer", {
    title: "Photos",
    name: "Slartibartfast"
  })
}

async function showInfo(ctx, next) {
  ctx.body = 'Piframe here! Ahoy.'
}

async function logClientMsg(ctx, next) {
  var data = ctx.request.body
  //var ip = ctx.ips.length > 0 ? ctx.ips[ctx.ips.length - 1] : ctx.ip
  winston.log(data.level,'CLIENT: ' + data.msg, data.extraInfo)
  ctx.body = data
}

function nextFileIsReady(ctx, next) {
  var nextFileExists = true
  try {
    winston.info('Checking if next file exists')
    var a = fs.accessSync('images/next.jpg', fs.F_OK)
    winston.info('Found next.jpg')
  } catch(err) {
    winston.info('Got an error while checking for next.jpg (' + JSON.stringify(err) + ').  Assuming it doesn\'t exist')
    nextFileExists = false
  }
  winston.info('nextFileExists = ' + nextFileExists)
  return nextFileExists
}
