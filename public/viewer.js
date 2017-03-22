$(document).ready(function() {
  window.keepmoving = true
  window.desiredSecondsPerPicture = 60
  window.minimumPauseBetweenRequests = 30 //give the server (and the cpu) a little breather
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
  "positionClass": "toast-top-center",
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
    imgNode.prop("src","feed?" + requestTime.getTime())
    console.log('Getting a picture.')
    imgNode.on('load',function() {
      window.lastLoadData = this
      EXIF.getData(this, function() {
        try {
            var datetime = EXIF.getTag(this, "DateTime");
            var orientation = EXIF.getTag(this, "Orientation");
            var label = EXIF.getTag(this,"Title")
            var msg = 'Picture acquired in ' + Math.floor((new Date() - requestTime) / 1000) + 's.  Orientation: ' + orientation + ' from ' + datetime;
            sendLogToServer('info',msg)
            //if(orientation == 8) {
            //  console.log("Rotating 90deg")
            //  imgNode.css("transform","rotate(90deg)");
            //}
            
            var secondsElapsedSinceLastUpdate = Math.floor((new Date() - timeOfLastPhotoUpdate) / 1000) 
            var secondsMissingToMatchDesiredWait = desiredSecondsPerPicture - secondsElapsedSinceLastUpdate
            
            var timeToWait = Math.max(secondsMissingToMatchDesiredWait,minimumPauseBetweenRequests)
            
            if(secondsElapsedSinceLastUpdate > 10000000) //first load
              timeToWait = 0 
            
            console.log('We\'ll wait ' + timeToWait + ' seconds before switching')
            schedulePhotoUpdate(imgNode,timeToWait * 1000, msg)
        } catch(exifErr) {
          schedulePhotoLoad(20000,'Failed to parse EXIF data: ' + exifErr)
        } 
      });
      
    }).on('error', function(){  // when theres an error
      schedulePhotoLoad(20000,'Failed to get next photo')
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


function schedulePhotoUpdate(imgNode, delay, msg)  {
    
  setTimeout(
    function() {
      updatePhoto(imgNode, msg)
    }, 
    delay)
}

function updatePhoto(imgNode, msg) {
  toastr.clear()
  $('.image-photo').empty()
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