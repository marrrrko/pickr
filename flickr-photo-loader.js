const _ = require("lodash");
const axios = require('axios');
const Flickr = require("flickrapi");
var winston;
const config = require('config');
var watcher
const flickrOptions = {
      api_key: config.get('api_key'),
      secret: config.get('secret'),
      user_id: config.get('user_id'),
      access_token: config.get('access_token'),
      access_token_secret: config.get('access_token_secret')
    };

module.exports = { getAGoodPhoto: getAGoodPhoto }

async function getAGoodPhoto(winstonLogger) {
  winston = winstonLogger;
  return new Promise(async function(resolve, reject) {
    let flickrConnection = await getFlickrConnection();
    let userids = config.get('users');

    let userId = userids[_.random(0, userids.length - 1, false)];
    
    let totatNumberOfPhotos = await getTotalNumberOfPhotos(flickrConnection, userId);
    let aGoodPictureData = undefined;
    let aGoodPictureBits = undefined;
    while (aGoodPictureData == undefined) {
      let aRandomPictureData = await getARandomPictureData(flickrConnection, userId, totatNumberOfPhotos)
      let aRandomPictureSizes = await getPictureAvailableSizes(flickrConnection, aRandomPictureData, userId)
      var aRandomPictureOriginalSize = _.find(aRandomPictureSizes.sizes.size, { label: "Original"});
      if (await pictureDataIsGood(aRandomPictureData, aRandomPictureOriginalSize)) {
        aGoodPictureData = aRandomPictureData;
        aGoodPictureBits = await getPictureBits(aRandomPictureOriginalSize.source);
      }
      else {
        winston.info('Picture ' + aRandomPictureData.photos.photo[0].title + ' is not good.  Trying another.')
      }
    }

    winston.info('Good picture obtained: ' + JSON.stringify(aGoodPictureData));    

    resolve({ photoInfo: aGoodPictureData, photoBitsBuffer: aGoodPictureBits});

  });
}

async function getFlickrConnection() {
  return new Promise(async function(resolve, reject) {
    Flickr.authenticate(flickrOptions, function(error, flickr) {
      if(error)
        reject(error)
      else
        resolve(flickr)
    });
  });
}

async function getTotalNumberOfPhotos(flickrConnection, userId) {
  return new Promise(async function(resolve, reject) {    
      flickrConnection.people.getPhotos({ user_id: userId, authenticated: true, privacy_filter: 4, per_page: 1}, function(err, result) {
        if(err)
          reject(err);
        else
          resolve(result.photos.total);
      });
  });
}

async function getARandomPictureData(flickrConnection, userId, totatNumberOfPhotos) {
  return new Promise(async function(resolve, reject) {
    var randomPhotoNumber = Math.floor(Math.random() * totatNumberOfPhotos);    
    try{ 
      //if(flickr.options && flickr.options.users && flickr.options.users.length)
      //  user = flickr.options.users[0];
        
      flickrConnection.photos.search({
        user_id: userId,
        authenticated: true,
        per_page: 1,
        page: randomPhotoNumber
      }, function(err, searchResult) { 
        resolve(searchResult); 
      });
    } catch (err)  {
      winston.error('Failed to flickr search', err)
      reject(err)
    }
  })
}

async function getPictureAvailableSizes(flickrConnection, flickrPhotoSearchResult, userId) {
  return new Promise(async function(resolve, reject) {
    flickrConnection.photos.getSizes({
      user_id: userId,
      authenticated: true,
      photo_id: flickrPhotoSearchResult.photos.photo[0].id
    }, function(err, availableSizes) { 
        if(err)
          reject(err);
        else
          resolve(availableSizes);
    });
  });
}

async function pictureDataIsGood(flickrPhotoSearchResult, originalPhotoData) {
  return new Promise(async function(resolve, reject) {
    let photoIsGood = flickrPhotoSearchResult.photos.photo[0].ispublic || flickrPhotoSearchResult.photos.photo[0].isfamily || flickrPhotoSearchResult.photos.photo[0].isfriend;
    photoIsGood = photoIsGood && originalPhotoData.media == "photo";
    if(photoIsGood) {
      resolve(true)
    } else {
      resolve(false);
    }
  })
}

async function getPictureBits(url) {
  return new Promise(async function(resolve, reject) {
    var response = await axios.get(url, { responseType: "arraybuffer" });
    var imageData = new Buffer(response.data, 'binary')
    resolve(imageData);
  });
}
