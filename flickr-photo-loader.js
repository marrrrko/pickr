
var importantStuff = {};
var _ = require("lodash");
var https = require('https');
var fs = require('fs');
var Flickr = require("flickrapi");
var winston;
var chokidar = require('chokidar');
var flickrConfig
var watcher

function supplyPhotos(flickrOptions, winstonLog) {
  
  flickrConfig = flickrOptions
  winston = winstonLog
  winston.info("Flickr photo loader doing it's thing")
  deletePartiallyLoadedFileIfFound();
  
  if(!nextFileExists())
    return retrieveNextPhoto(flickrOptions).then(beReadyToFetchAnotherPhotoWhenTheNeedArises).catch(function(err) {
          winston.error('Something bad happened while talking to flickr', err)
        });
  else
    return beReadyToFetchAnotherPhotoWhenTheNeedArises().catch(function(err) {
          winston.error('Something bad happened while talking to flickr', err)
        });;
}

function beReadyToFetchAnotherPhotoWhenTheNeedArises() {
  return new Promise(function(resolve, reject) 
      {
        if(watcher)
         reject('Badness.  Multiple watchers.')
        watcher = chokidar.watch('./images/next.jpg', {
        persistent: false
      }).on('unlink', function(path) {
        winston.info('Looks like next.jpg was consumed')
        watcher.close()
        watcher = null
        resolve(retrieveNextPhoto(flickrConfig))
      }).on('ready', function() {
        winston.info('Tracking ./images/next.jpg for unlinking');
        resolve();
      })
  })
}

function retrieveNextPhoto(flickrOptions, user) {
  return new Promise(function(resolve, reject) {
    Flickr.authenticate(flickrOptions, function(error, flickr) {

      flickr.people.getPhotos({ user_id: flickrOptions.users[0], authenticated: true, privacy_filter: 4, per_page: 1}, function(err, result) {
        if(err)
          reject(err);
        importantStuff.totalNumberOfPhotos = result.photos.total;
        resolve(getAPicture(flickr))
      });
        
      
    });
  });
}

function getAPicture(flickr) {
  return new Promise(function(resolve, reject) {
    var randomPhotoNumber = Math.floor(Math.random() * importantStuff.totalNumberOfPhotos);
    winston.info('Randomly selected photo #' + randomPhotoNumber + ' out of ' + importantStuff.totalNumberOfPhotos + ' photos.')
    try{ 
      var user = flickr.options.user_id;
      if(flickr.options.users.length)
        user = flickr.options.users[0];
        
      flickr.photos.search({
        user_id: user,
        authenticated: true,
        per_page: 1,
        page: randomPhotoNumber
      }, function(err, searchResult) { 
        resolve(handleSearchResult(err, searchResult, flickr)); 
      });
    } catch (err)  {
      winston.error('Failed to flickr search', err)
      reject(err)
    }
  })
}

function handleSearchResult(err, searchResult, flickr) {
  return new Promise(function(resolve, reject) {
    winston.info("Fetching photo titled \"" + searchResult.photos.photo[0].title + "\".");
    if(searchResult.photos.photo[0].ispublic || searchResult.photos.photo[0].isfamily || searchResult.photos.photo[0].isfriend) {
      try {
        flickr.photos.getSizes({
          user_id: flickr.options.user_id,
          authenticated: true,
          photo_id: searchResult.photos.photo[0].id
        }, function(err, sizesResult) { 
          resolve(handleGetSizesResult(err,sizesResult,searchResult.photos.photo[0], flickr)); 
          
        });
      } catch (err)  {
        winston.error('Failed to flicke getSizes', err)
        reject(err)
      }
    } else {
      winston.info("Landed on a private photo.  That's bad.  Let's try again.");
      resolve(getAPicture(flickr));
    }
  })
}

function handleGetSizesResult(err,result, photoInfo, flickr) {
  return new Promise(function(resolve, reject) {
    var originalPhoto = _.findWhere(result.sizes.size, { label: "Original"});
      if(originalPhoto.media != "photo") {
        winston.info("Landed on a video.  That's bad.  Let's try again.");
        resolve(getAPicture());
      } else {
        var fileStream = fs.createWriteStream("./images/next_partial.jpg")
        fileStream.on('finish', function () {
          winston.info("Photo acquired!");
          try {
            fs.renameSync("./images/next_partial.jpg", "./images/next.jpg")
          } catch(err) {
            winston.error("Failed to rename next_partial to next: " + err);
          }
          beReadyToFetchAnotherPhotoWhenTheNeedArises().then(resolve(photoInfo));
        });
        var request = https.get(originalPhoto.source, function(response) {
          response.pipe(fileStream);
        });
      }
  })
}

function nextFileExists() {
  var nextFileExists = true;
  try {
    var a = fs.accessSync('./images/next.jpg', fs.F_OK);
    winston.info('Found next');
  } catch(err) {
    nextFileExists = false;
    winston.info('Didn\'t find next.');
  }
  
  return nextFileExists;
}

function deletePartiallyLoadedFileIfFound() {
  var partialFileExists = true;
  try {
    var a = fs.accessSync('./images/next_partial.jpg', fs.F_OK);
    winston.info('Found next_partial');
  } catch(err) {
    partialFileExists = false;
    winston.info('Didn\'t find next_partial.  Clean clean.');
  }
  
  if(partialFileExists) {
    fs.unlinkSync('./images/next_partial.jpg');
  }
}

module.exports.retrieveNextPhoto = retrieveNextPhoto
module.exports.supplyPhotos = supplyPhotos
