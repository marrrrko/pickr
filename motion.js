const Gpio = require('onoff').Gpio;
const pir = new Gpio(4, 'in', 'both');
const PubSub = require('pubsub-js');
//var logger = require('winston');
const config = require('config');
const logger = require('bunyan').createLogger(config.get('LOGGER_OPTIONS'));

module.exports.startWatching = startWatching;
module.exports.stopWatching = stopWatching;

function startWatching(publishInactivity) {
  logger.debug("Starting PIR watching");
  
  if(publishInactivity == undefined)
    publishInactivity = false;
  
  pir.watch(function (err, value) {
    if (err) {
      throw err;
    }
  
    logger.info('Got something from PIR: ' + value);
    if(value == 1 || publishInactivity)
      PubSub.publish( 'motion-activity', value);
  });
}

function stopWatching() {
  logger.debug("Stopping PIR watching");
  pir.unwatch();
}

process.on('SIGINT', function () {
    pir.unexport();
});