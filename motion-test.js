const config = require('config');
const logger = require('bunyan').createLogger(config.get('LOGGER_OPTIONS'));
const PubSub = require('pubsub-js');

logger.add(logger.transports.File, { name: 'debug', filename: 'motion-test.log',level: 'warning', 'timestamp':function() { return moment().format() ; } })

const motion = require("./motion.js")(logger);

motion.startWatching(true);
var token = PubSub.subscribe( 'motion-activity', async function(mvalue) { 
    logger.info('Motion detected: ' + mvalue);
});  

