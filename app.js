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
const monitorctl = require('./monitorcontrol');
const PubSub = require('pubsub-js');

var currentPhoto = undefined;
var photoQueue = [];

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
    
    var token1 = PubSub.subscribe( 'photosArrivals', handleNewPhotoArrival );
    var token2 = PubSub.subscribe( 'photosRequests', flickrLoader.handlePhotoRequest );
    requestAnotherPhoto();

    //Wait 10 seconds and get another picture for the queue.
    setTimeout(() => { requestAnotherPhoto();}, 10000);

    if(config.get('dailySleepAtMinutes').length)
      startMonitorSleepActions();
}

function handleNewPhotoArrival(msg, photoData) {
  photoQueue.push(photoData);
  console.log('Photo has arrived.  Queue now at length ' + photoQueue.length);
}

function requestAnotherPhoto() {
  PubSub.publish( 'photosRequests', { logger: logger } );
}

function startMonitorSleepActions() {

  let nextAction = monitorctl.getNextAction(
                        null, 
                        config.get('dailySleepAtMinutes'), 
                        config.get('dailyWakeAtMinutes'));

    let msUntilNextAction = nextAction.time - (new Date).getTime();
    if(msUntilNextAction < 0)
      msUntilNextAction = 0;

    logger.info('Next monitor action is "' + nextAction.type + '" at ' + (new Date(nextAction.time)).toLocaleTimeString() + ' (in ' + msUntilNextAction + 'ms).')
    setTimeout(() => execSleepAction(nextAction),msUntilNextAction);
}

async function providePhoto(ctx, next) {
  try {
    logger.info('A client has requested a photo.');
    //logger.info('A client has requested a photo.  System average cpu load is ' + os.loadavg() + '. Free memory: ' + Math.round(os.freemem()/1048576) + ' out of ' + Math.round(os.totalmem()/1048576) + 'MB.')   
    //logger.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')

    if(photoQueue.length > 0) {      
      currentPhoto = photoQueue.shift();
      logger.info('Got a picture from the queue.  Queue length now ' + photoQueue.length);
      requestAnotherPhoto();
    } else {
      logger.warn('Looks like queue is empty.  Slow poke')
    }
    
    if(currentPhoto !== undefined) {
      logger.info('Serving current photo')
      ctx.body = currentPhoto;
    } else {  
      ctx.status = 404;
      ctx.body = { message: 'No file to serve yet.' }
    }

    await next();
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

async function execSleepAction(action)  {
  logger.info('Time to sleep/wake: ' + JSON.stringify(action));
  await monitorctl.executeAction(action);
  let nextAction = monitorctl.getNextAction(
                        action, 
                        config.get('dailySleepAtMinutes'), 
                        config.get('dailyWakeAtMinutes'));

  let msUntilNextAction = nextAction.time - (new Date).getTime();
    if(msUntilNextAction < 0)
      msUntilNextAction = 0;
  logger.info('Next monitor action is "' + nextAction.type + '" at ' + (new Date(nextAction.time)).toLocaleTimeString() + ' (in ' + msUntilNextAction + 'ms).')
  setTimeout(() => execSleepAction(nextAction),msUntilNextAction);
}
