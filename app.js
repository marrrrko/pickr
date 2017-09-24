'use strict'

var koa = require('koa')
var bodyparser = require('koa-bodyparser')
var app = new koa()
var route = require('koa-route')
var serve = require('koa-static')
var handlebars = require('koa-handlebars')
var send = require('koa-send')
var flickrLoader = require('./flickr-photo-loader')
var flickrConfig = require('./flickr-config')
var fs = require('fs')
var winston = require('winston')
var http = require('http')
var os = require('os')
winston.add(winston.transports.File, { name: 'normal', filename: 'frame.log' })
winston.add(winston.transports.File, { name: 'errors', filename: 'errors.log',level: 'error' })

startThingsUp();

function startThingsUp() {
  return new Promise((resolve, reject) => {
    winston.info("Getting things ready...")
    
    app.use(handlebars({
      defaultLayout: "main"
    }))
    app.use(bodyparser());
    app.use(route.get('/feed', providePhoto))
    app.use(route.get('/viewer', showViewer))
    app.use(route.get('/info', showInfo))
    app.use(route.post('/log', logClientMsg))
    
    app.use(serve('./public'))
    
    flickrLoader.supplyPhotos(flickrConfig,winston).catch(e => winston.error('Photo supply failed', e))
    
    var port = process.env.PORT
    if(!port)
      port = 8080
    
    app.listen(port,null,null,function() { winston.info('Process #' + process.pid + ' started sharing photos on port ' + port)})
    winston.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
  })
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
    
    await send(this, 'images/current.jpg')
    winston.info('Current.jpg served')
    await next
  } catch(err) {
    winston.error("Failed to provide a photo: " + err)
    await next
  }
}

async function showViewer(ctx, next) {
  await this.render("viewer", {
    title: "Photos",
    name: "Worldy"
  })
}

async function showInfo(ctx, next) {
  this.body = 'Piframe here! Ahoy.'
}

async function logClientMsg(ctx, next) {
  var data = this.request.body
  //var ip = ctx.ips.length > 0 ? ctx.ips[ctx.ips.length - 1] : ctx.ip
  winston.log(data.level,'CLIENT: ' + data.msg, data.extraInfo)
  this.body = data
}

function nextFileIsReady(ctx, next) {
  var nextFileExists = true
  try {
    winston.info('Checking if next file exists')
    var a = fs.accessSync('images/next.jpg', fs.F_OK)
    winston.info('Found next.jpg')
  } catch(err) {
    winston.info('Got an error while checking for next.jpg.  Assuming it doesn\'t exist')
    nextFileExists = false
  }
  winston.info('nextFileExists = ' + nextFileExists)
  return nextFileExists
}
