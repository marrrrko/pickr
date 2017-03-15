
var importantStuff = {};
var _ = require("underscore");
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
    return retrieveNextPhoto(flickrOptions).then(beReadyToFetchAnotherPhotoWhenTheNeedArises);
  else
    return beReadyToFetchAnotherPhotoWhenTheNeedArises();
}

function beReadyToFetchAnotherPhotoWhenTheNeedArises() {
  return new Promise(function(resolve, reject) 
      {
        if(watcher)
         throw 'Badness.  Multiple watchers.'
        watcher = chokidar.watch('./images/next.jpg', {
        persistent: false
      }).on('unlink', function(path) {
        winston.info('Looks like next.jpg was consumed')
        watcher.close()
        watcher = null
        retrieveNextPhoto(flickrConfig)
      }).on('ready', function() {
        winston.info('Tracking ./images/next.jpg for unlinking');
        resolve();
      })
  })
}

function retrieveNextPhoto(flickrOptions) {
  return new Promise(function(resolve, reject) {
    Flickr.authenticate(flickrOptions, function(error, flickr) {
      importantStuff.flickr = flickr;
      
      var mode = 'mine';
      if(Math.random() < 0.5 && false)
        mode = 'aris'
      
      if(mode == 'mine' ) {
        flickr.photos.getCounts({ dates:[0,new Date().getTime()]}, function(err, result) {
          importantStuff.totalNumberOfPhotos = result.photocounts.photocount[0].count;
          getAPicture(resolve, reject);
        });
      } else {
        flickr.photos.search({ dates:[0,new Date().getTime()]}, function(err, result) {
          importantStuff.totalNumberOfPhotos = result.photocounts.photocount[0].count;
          getAPicture(resolve, reject);
        });
        
      }
    });
  });
}

function getAPicture(resolve, reject) {
    var randomPhotoNumber = Math.floor(Math.random() * importantStuff.totalNumberOfPhotos);
    winston.info('Randomly selected photo #' + randomPhotoNumber + ' out of ' + importantStuff.totalNumberOfPhotos + ' photos.')
    importantStuff.flickr.photos.search({
      user_id: importantStuff.flickr.options.user_id,
      authenticated: true,
      per_page: 1,
      page: randomPhotoNumber
    }, function(err, searchResult) { handleSearchResult(err, searchResult, resolve, reject); });
}

function handleSearchResult(err, searchResult, resolve, reject) {
  winston.info("Fetching photo titled \"" + searchResult.photos.photo[0].title + "\".");
  if(searchResult.photos.photo[0].ispublic || searchResult.photos.photo[0].isfamily || searchResult.photos.photo[0].isfriend) {
    importantStuff.flickr.photos.getSizes({
      user_id: importantStuff.flickr.options.user_id,
      authenticated: true,
      photo_id: searchResult.photos.photo[0].id
    }, function(err, sizesResult) { handleGetSizesResult(err,sizesResult,searchResult.photos.photo[0], resolve, reject); });
  } else {
    winston.info("Landed on a private photo.  That's bad.  Let's try again.");
    getAPicture(resolve, reject);
  }
}

function handleGetSizesResult(err,result, photoInfo, resolve, reject) {
  var originalPhoto = _.findWhere(result.sizes.size, { label: "Original"});
  if(originalPhoto.media != "photo") {
    winston.info("Landed on a video.  That's bad.  Let's try again.");
    getAPicture(resolve, reject);
  } else {
    var fileStream = fs.createWriteStream("./images/next_partial.jpg")
    fileStream.on('finish', function () {
      winston.info("Photo acquired!");
      try {
        fs.renameSync("./images/next_partial.jpg", "./images/next.jpg")
      } catch(err) {
        winston.error("Failed to rename next_partial to next: " + err);
      }
      beReadyToFetchAnotherPhotoWhenTheNeedArises()
      resolve(photoInfo);
    });
    var request = https.get(originalPhoto.source, function(response) {
      response.pipe(fileStream);
    });
  }
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
