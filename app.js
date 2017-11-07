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
const logger = require('winston')
const http = require('http')
const os = require('os')

var currentPhoto = undefined;
var nextPhoto = undefined;

logger.add(logger.transports.File, { name: 'debug', filename: 'frame.log','timestamp': true })
logger.add(logger.transports.File, { name: 'errors', filename: 'errors.log',level: 'error', 'timestamp': true  })

startThingsUp();

function startThingsUp() {
    logger.info("Getting things ready...")
    
    let router = setupRouting();
    app.use(handlebars({ defaultLayout: 'main' }));
    app.use(bodyparser());
    app.use(serve('./public'))
    app.use(router.routes())
    
    var port = process.env.PORT
    if(!port)
      port = 8080

    let server = http.createServer(app.callback()).listen(
            port,
            null,

            null,function() { 
              logger.info('Process #' + process.pid + ' started sharing photos on port ' + port)
            });
    server.keepAliveTimeout = 120000;
    
    logger.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
    getNextPhoto();
}

async function getNextPhoto() {
  return new Promise(async function(resolve, reject) {
    if(nextPhoto !== "fetching") {
      nextPhoto = "fetching";
      flickrLoader
        .getAGoodPhoto(logger)
        .then(function(photo) { 
          nextPhoto = photo;
          logger.info('Next file ready.');
          resolve();
        }).catch(err => {
          logger.error(err);
          reject(err)
        });
    }
  });
}

async function providePhoto(ctx, next) {
  try {
    logger.info('A client has requested a photo.  System average cpu load is ' + os.loadavg() + '. Free memory: ' + Math.round(os.freemem()/1048576) + ' out of ' + Math.round(os.totalmem()/1048576) + 'MB.')   
    logger.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
    if(currentPhoto == undefined && nextPhoto == undefined) {
      logger.error('Looks like flow of photos hasn\'t started!');
      ctx.status = 500;
      ctx.body = { message: 'No flow!' }
    }

    if(nextPhoto !== 'fetching') {
      logger.info('Looks like we have a new picture to serve')
      currentPhoto = nextPhoto;
      nextPhoto = undefined;
    } else {
      logger.warn('Looks like next file is not ready yet.  Slow poke')
    }
    
    if(currentPhoto !== undefined) {
      logger.info('Serving current photo')
      ctx.body = currentPhoto;
    } else {  
      ctx.status = 404;
      ctx.body = { message: 'No file to serve yet.' }
    }

    await next;
    if(nextPhoto === undefined)
      getNextPhoto();
  } catch(err) {
    logger.error("Failed to provide a photo: " + err)
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
  logger.info('Viewer request')
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
  logger.log(data.level,'CLIENT: ' + data.msg, data.extraInfo)
  ctx.body = data
}
