const Gpio = require('onoff').Gpio;
const pir = new Gpio(4, 'in', 'both');
const PubSub = require('pubsub-js');
var logger = require('winston');

module.exports.startWatching = startWatching;
module.exports.stopWatching = stopWatching;

function startWatching() {
  logger.debug("Starting PIR watching");
  pir.watch(function (err, value) {
    if (err) {
      throw err;
    }
  
    logger.info('Got something from PIR: ' + value);
    if(value == 1)
      PubSub.publish( 'motion-activity', "sawsomething");
  });
}

function stopWatching() {
  logger.debug("Stopping PIR watching");
  pir.unwatch();
}

process.on('SIGINT', function () {
    pir.unexport();
});

