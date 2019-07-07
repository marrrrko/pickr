const Gpio = require('onoff').Gpio;
const pir = new Gpio(4, 'in', 'both');
const PubSub = require('pubsub-js');

module.exports = function(logger) {

  var startWatching = function(publishInactivity) {
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

  var stopWatching = function() {
    logger.debug("Stopping PIR watching");
    pir.unwatch();
  }

  return {
    startWatching,
    stopWatching
  }
}

process.on('SIGINT', function () {
    pir.unexport();
});