$(document).ready(function() {
  window.keepmoving = true
  window.desiredSecondsPerPicture = 40
  window.minimumPauseBetweenRequests = 5
  window.timeOfLastPhotoUpdate = new Date(0)
  getNextPhoto()
});

function getNextPhoto() {
  try {
    var imgNode = $('<img class="the-photo" alt="If you can read this, something went terribly wrong.">')
    var requestTime = new Date()
    imgNode.prop("src","feed?" + requestTime.getTime())
    console.log('Getting a picture.')
    imgNode.on('load',function() {
      EXIF.getData(this, function() {
          var datetime = EXIF.getTag(this, "DateTime");
          var orientation = EXIF.getTag(this, "Orientation");
          var label = EXIF.getTag(this,"Title")
          console.log('Picture acquired in ' + Math.floor((new Date() - requestTime) / 1000) + 's.  or = ' + orientation + ' from ' + datetime);
          
          //if(orientation == 8) {
          //  console.log("Rotating 90deg")
          //  imgNode.css("transform","rotate(90deg)");
          //}
          
          var secondsElapsedSinceLastUpdate = Math.floor((new Date() - timeOfLastPhotoUpdate) / 1000) 
          var secondsMissingToMatchDesiredWait = desiredSecondsPerPicture - secondsElapsedSinceLastUpdate
          
          var timeToWait = Math.max(secondsMissingToMatchDesiredWait,minimumPauseBetweenRequests)
          console.log('We\'ll wait ' + timeToWait + ' seconds before switching')
          setTimeout(function() {updatePhoto(imgNode)},timeToWait * 1000)
        });
      
    })
    
    //var now = new moment();
    //$(".top-text").text("Updated text now: " + now.format("HH:mm:ss"));
  } catch(err) {
    console.log("Something bad happened: " + err)
    console.log("No worries.  We'll try again shortly.")
    setTimeout(getNextPhoto,5000)
  }
}

function updatePhoto(imgNode) {
  $('.image-photo').empty()
  $('.image-photo').append(imgNode)
  window.timeOfLastPhotoUpdate = new Date()
  getNextPhoto();
}