$(document).ready(function() {
  window.keepmoving = true
  window.desiredSecondsPerPicture = 60
  window.minimumPauseBetweenRequests = 10 //give the server (and the cpu) a little breather
  window.timeOfLastPhotoUpdate = new Date(0)
  sendLogToServer('info','Client starting with ' + desiredSecondsPerPicture + 's/' + minimumPauseBetweenRequests + 's delays configured')
  getNextPhoto()
  toastr["success"]("My name is Inigo Montoya. You killed my father. Prepare to die!")
});

toastr.options = {
  "closeButton": false,
  "debug": false,
  "newestOnTop": false,
  "progressBar": false,
  "positionClass": "toast-bottom-left",
  "preventDuplicates": false,
  "onclick": null,
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut",
  "showDuration": "180",
  "hideDuration": "0",
  "timeOut": "0",
  "extendedTimeOut": "0"
}

function getNextPhoto() {
  try {
    var imgNode = $('<img class="the-photo" alt="If you can read this, something went terribly wrong.">')
    var requestTime = new Date()
    $.getJSON("feed?" + requestTime.getTime(), function( data ) {    
      imgNode.attr('src','data:image/jpeg;base64,' + data.photoData);
      var datetime = new Date(parseInt(data.photoExif.tags.DateTimeOriginal) * 1000);
      var orientation = data.photoExif.tags.Orientation;
      var label = data.photoInfo.photos.photo[0].title;
      var msg = (new Date()).toLocaleTimeString() + ': ' + label + ' Orientation: ' + orientation + ' from ' + datetime;
      sendLogToServer('info',msg)
      
      var neededRotation = 0;
      if(orientation == 8) {
        neededRotation = 270; 
      } else if (orientation == 6)  {
        neededRotation = 90;
      }
      
      var secondsElapsedSinceLastUpdate = Math.floor((new Date() - timeOfLastPhotoUpdate) / 1000) 
      var secondsMissingToMatchDesiredWait = desiredSecondsPerPicture - secondsElapsedSinceLastUpdate
      
      var timeToWait = Math.max(secondsMissingToMatchDesiredWait,minimumPauseBetweenRequests)
      
      if(secondsElapsedSinceLastUpdate > 10000000) //first load
        timeToWait = 0 
      
      console.log('We\'ll wait ' + timeToWait + ' seconds before switching')
      schedulePhotoUpdate(imgNode, neededRotation, timeToWait * 1000, msg)
    });
  } catch(err) {
    schedulePhotoLoad(20000,'Failed to retrieve photo: ' + err)
  }
}

function schedulePhotoLoad(delay, errMessage)  {
  
  if(window.photoloadT)
    clearTimeout(window.photoload)
  
  window.photoloadT = setTimeout(getNextPhoto,delay)
  if(errMessage) {
    sendLogToServer('error',errMessage)
    toastr["error"](errMessage)
    toastr["info"]("Retrying in " + Math.floor(delay/1000) + "s")
  }
}


function schedulePhotoUpdate(imgNode, rotation, delay, msg)  {
    
  setTimeout(
    function() {
      updatePhoto(imgNode, msg, rotation)
    }, 
    delay)
}

function updatePhoto(imgNode, msg, rotation) {
  toastr.clear()
  $('.image-photo').empty()
  if(rotation && rotation != 0)  {
    imgNode.css("transform","rotate(" + rotation + "deg)");
    console.log('Rotated ' + rotation)
  }
  $('.image-photo').append(imgNode)
  window.timeOfLastPhotoUpdate = new Date()
  
  if(msg)
    toastr.info(msg, { positionClass: "toast-bottom-left", showDuration: 30  })
  
  getNextPhoto();
}

function sendLogToServer(level, msg, extraInfo) {
  try { 
    console.log(msg)
    $.post('log', { level: level, msg: msg, extraInfo: extraInfo }) 
  } 
  catch (err) {
    console.log('Failed to log with server.  Must be down.')
    toastr["warning"]("Failed to log with server.  Must be down.")
  }
}

window.onerror = function(errorMsg, url, lineNumber) {
    schedulePhotoLoad(20000,errorMsg)
    return false;
}