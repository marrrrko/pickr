
var importantStuff = {};
var _ = require("underscore");
var https = require('https');
var fs = require('fs');
var Flickr = require("flickrapi");

function retrieveNextPhoto(flickrOptions) {
  var promise = new Promise(function(resolve, reject) {
    Flickr.authenticate(flickrOptions, function(error, flickr) {
      importantStuff.flickr = flickr;
      flickr.photos.getCounts({ dates:[0,new Date().getTime()]}, function(err, result) {
        importantStuff.totalNumberOfPhotos = result.photocounts.photocount[0].count;
        getAPicture(resolve, reject);
      });
    });
  });

  return promise;
}

function getAPicture(resolve, reject) {
    var randomPhotoNumber = Math.floor(Math.random() * importantStuff.totalNumberOfPhotos);
    console.log('Randomly selected photo #' + randomPhotoNumber + ' out of ' + importantStuff.totalNumberOfPhotos + ' photos.')
    importantStuff.flickr.photos.search({
      user_id: importantStuff.flickr.options.user_id,
      authenticated: true,
      per_page: 1,
      page: randomPhotoNumber
    }, function(err, searchResult) { handleSearchResult(err, searchResult, resolve, reject); });
}

function handleSearchResult(err, searchResult, resolve, reject) {
  console.log("Fetching photo titled \"" + searchResult.photos.photo[0].title + "\".");
  if(searchResult.photos.photo[0].ispublic || searchResult.photos.photo[0].isfamily || searchResult.photos.photo[0].isfriend) {
    importantStuff.flickr.photos.getSizes({
      user_id: importantStuff.flickr.options.user_id,
      authenticated: true,
      photo_id: searchResult.photos.photo[0].id
    }, function(err, sizesResult) { handleGetSizesResult(err,sizesResult,searchResult.photos.photo[0], resolve, reject); });
  } else {
    console.log("Landed on a private photo.  That's bad.  Let's try again.");
    getAPicture(resolve, reject);
  }
}

function handleGetSizesResult(err,result, photoInfo, resolve, reject) {
  var originalPhoto = _.findWhere(result.sizes.size, { label: "Large"});
  if(originalPhoto.media != "photo") {
    console.log("Landed on a video.  That's bad.  Let's try again.");
    getAPicture(resolve, reject);
  } else {
    var filename = "./images/next_next.jpg";
    var fileUrl = "/images/next_next.jpg";
    var fileStream = fs.createWriteStream(filename);
    fileStream.on('finish', function () {
      photoInfo.file = fileUrl;
      console.log("Photo acquired!");
      try {
        fs.renameSync("./images/next_next.jpg", "./images/next.jpg")
      } catch(err) {
        console.log("Failed to rename next_next to next: " + err);
      }
      resolve(photoInfo);
    });
    var request = https.get(originalPhoto.source, function(response) {
      response.pipe(fileStream);
    });
  }
}

module.exports.retrieveNextPhoto = retrieveNextPhoto;
