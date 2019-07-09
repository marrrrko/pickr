const config = require('config');
const logger = require('bunyan').createLogger(config.get('LOGGER_OPTIONS'));
const PubSub = require('pubsub-js');

const motion = require("./motion.js")(logger);

motion.startWatching(true);
var token = PubSub.subscribe( 'motion-activity', async function(mvalue) { 
    logger.info('Motion detected: ' + mvalue);
});  

