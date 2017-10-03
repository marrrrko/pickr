'use strict'

const koa = require('koa')
const bodyparser = require('koa-bodyparser')
const app = new koa()
const routing = require('koa-router')
const serve = require('koa-static')
const handlebars = require('koa-handlebars')
const send = require('koa-send')
const flickrLoader = require('./flickr-photo-loader')
const config = require('config')
const fs = require('fs')
const winston = require('winston')
const http = require('http')
const os = require('os')
const piexif = require("piexifjs");

var currentPhoto = undefined;
var nextPhoto = undefined;

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
    getNextPhoto();
}

async function getNextPhoto() {
  return new Promise(async function(resolve, reject) {
    if(nextPhoto !== "fetching") {
      nextPhoto = "fetching";
      flickrLoader
        .getAGoodPhoto(winston)
        .then(function(photo) { 
          nextPhoto = photo;
          //winston.info('Next file retrieved.  Adding exif stuff.');
          //let base64imageData = nextPhoto.photoBitsBuffer.toString('base64');
          //let exifdata = piexif.load('data:image/jpeg;base64,' + base64imageData);
          //winston.debig('0th exif: ' + JSON.stringify(exifdata["0th"]))
          winston.info('Next file ready.');
          resolve();
        }).catch(err => {
          winston.error(err);
          reject(err)
        });
    }
  });
}

async function providePhoto(ctx, next) {
  try {
    winston.info('A client has requested a photo.  System average cpu load is ' + os.loadavg() + '. Free memory: ' + Math.round(os.freemem()/1048576) + ' out of ' + Math.round(os.totalmem()/1048576) + 'MB.')   
    winston.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
    if(nextPhoto !== undefined && nextPhoto !== 'fetching') {
      winston.info('Looks like we have a new picture to serve')
      currentPhoto = nextPhoto;
      nextPhoto = undefined;
    } else {
      winston.warn('Looks like next file is not ready yet.  Slow poke')
    }
    
    if(currentPhoto !== undefined) {
      winston.info('Serving current photo')
      ctx.body = currentPhoto.photoBitsBuffer;
      ctx.set('Content-Type', 'image/jpeg');
      ctx.set('Content-Length', currentPhoto.photoBitsBuffer.byteLength);
      ctx.set('X-Photo-Meta', JSON.stringify(currentPhoto.photoInfo));
    } else {  
      ctx.status = 404;
      ctx.body = { message: 'No file to serve yet.' }
    }

    await next;
    if(nextPhoto === undefined)
      await getNextPhoto();
  } catch(err) {
    winston.error("Failed to provide a photo: " + err)
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
