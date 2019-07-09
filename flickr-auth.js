const Flickr = require("flickrapi");
const config = require('config');

const flickrOptions = {
  api_key: config.get('api_key'),
  secret: config.get('secret'),
  user_id: config.get('user_id'),
  access_token: config.get('access_token'),
  access_token_secret: config.get('access_token_secret')
};

console.log("Attempting flickr authentication with " + JSON.stringify(flickrOptions))
Flickr.authenticate(flickrOptions, function(error, flickr) {
  if(error) {
    console.log("Failed to connect: " + error)
  } else {
    console.log("Success!")
  }
});