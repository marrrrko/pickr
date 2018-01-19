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
const papertrail = require('winston-papertrail')
const http = require('http')
const os = require('os')
const monitorctl = require('./monitorcontrol');
const PubSub = require('pubsub-js');
const moment = require('moment');
const motion = require('./motion');

var currentPhoto = undefined;
var photoQueue = [];
var queuePaused = false;
var brokenBrowserTimer = setTimeout(restartClient, 15 * 60 * 1000);
var idleMotionTimer = null;

logger.add(logger.transports.File, { name: 'debug', filename: 'frame.log', 'timestamp':function() { return moment().format() ; } })
logger.add(logger.transports.File, { name: 'errors', filename: 'errors.log',level: 'warning', 'timestamp':function() { return moment().format() ; } })
logger.add(papertrail.Papertrail, { level: 'info', host: 'logs6.papertrailapp.com', port: 28797 });

startThingsUp();

async function startThingsUp() {
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

    let motionIdleSleepAfterMinutes = config.get('sleepAfterLackOfMotionMinutes');
    if(motionIdleSleepAfterMinutes && motionIdleSleepAfterMinutes > 0) {
      logger.info('Using motion detection to enable idle sleep')
      await startMotionIdleWatching(motionIdleSleepAfterMinutes);
    } 
}

async function startMotionIdleWatching(motionIdleSleepAfterMinutes) {
  await setMonitorPower(1);
  motion.startWatching();
  var token3 = PubSub.subscribe( 'motion-activity', async function() { await resetIdleMotionTimer(motionIdleSleepAfterMinutes) } );  
  await resetIdleMotionTimer(motionIdleSleepAfterMinutes);
}

async function resetIdleMotionTimer(motionIdleSleepAfterMinutes) {
  logger.info("Motion detected.  Resetting idle timer")
  if(idleMotionTimer)
    clearTimeout(idleMotionTimer);
  
  if(queuePaused) {
    logger.info("Waking sleeping monitor")
    await setMonitorPower(1);
  }
  
  idleMotionTimer = setTimeout(async function() {
    logger.debug("Idle timer is up! Time to sleep");
    await setMonitorPower(0);
  },motionIdleSleepAfterMinutes * 60 * 1000)
}

function handleNewPhotoArrival(msg, photoData) {
  photoQueue.push(photoData);
  logger.info('Photo has arrived.  Queue now at length ' + photoQueue.length);
}

function requestAnotherPhoto() {
  PubSub.publish( 'photosRequests', { } );
}

async function providePhoto(ctx) {
  try {
    logger.info('A client has requested a photo.');
    if(brokenBrowserTimer)
      clearTimeout(brokenBrowserTimer);
    
    brokenBrowserTimer = setTimeout(restartClient, 15 * 60 * 1000); //Assume browser crashed if no request in 20 minutes
    
    //logger.info('A client has requested a photo.  System average cpu load is ' + os.loadavg() + '. Free memory: ' + Math.round(os.freemem()/1048576) + ' out of ' + Math.round(os.totalmem()/1048576) + 'MB.')   
    //logger.info('App memory usage is ' + Math.round(process.memoryUsage().rss / (1048576),0) + 'MB (used heap = ' + Math.round(process.memoryUsage().heapUsed / (1048576),0) + 'MB)')
    if(!queuePaused) {
      if(photoQueue.length > 0) {      
        currentPhoto = photoQueue.shift();
        logger.info('Got a picture from the queue.  Queue length now ' + photoQueue.length);
        if(photoQueue.length < 3)
          requestAnotherPhoto();
      } else {
        logger.warn('Looks like queue is empty.  Slow poke');
        requestAnotherPhoto();
      }
    } else {
      logger.info('Queue is paused.  Returning previous picture.');
    }
    
    if(currentPhoto !== undefined) {
      ctx.body = currentPhoto;
    } else {  
      logger.warn('No photo to serve.  Returning 404.');
      ctx.status = 404;
      ctx.body = { message: 'No file to serve yet.' };
    }
  } catch(err) {
    logger.error('Failed to provide a photo: ',err);
    ctx.status = 500;
    ctx.body = { message: err.message };
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

function restartClient() {
  logger.error('Haven\'t received a browser request in a while.  Assuming browser crashed.  Restarting.');
  require('child_process').exec('sudo /sbin/shutdown -r now', function (msg) { logger.info(msg) });
}

async function setMonitorPower(on) {
  if(on) {
    console.log('Putting monitor to sleep');
    queuePaused = false;
    await monitorctl.wakeMonitor();
  } else {
    console.log('Waking monitor up');
    queuePaused = true;
    await monitorctl.putMonitorToSleep();
  }
}