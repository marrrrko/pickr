$(document).ready(function() {
  window.keepmoving = true
  window.desiredSecondsPerPicture = 60
  window.minimumPauseBetweenRequests = 30 //give the server (and the cpu) a little breather
  window.timeOfLastPhotoUpdate = new Date(0)
  sendLogToServer('info','Client starting with ' + desiredSecondsPerPicture + 's/' + minimumPauseBetweenRequests + 's delays configured')
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
          var msg = 'Picture acquired in ' + Math.floor((new Date() - requestTime) / 1000) + 's.  or = ' + orientation + ' from ' + datetime;
          sendLogToServer('info',msg)
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
    sendLogToServer('error','Failed to get next photo: ' + err )
    setTimeout(getNextPhoto,20000)
  }
}

function updatePhoto(imgNode) {
  $('.image-photo').empty()
  $('.image-photo').append(imgNode)
  window.timeOfLastPhotoUpdate = new Date()
  getNextPhoto();
}

function sendLogToServer(level, msg, extraInfo) {
  try { 
    console.log(msg)
    $.post('log', { level: level, msg: msg, extraInfo: extraInfo }) 
  } 
  catch (err) {
    console.log('Failed to log with server.  Must be down.')
  }
}