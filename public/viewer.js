$(document).ready(function() {
  window.keepmoving = true
  window.desiredSecondsPerPicture = 60
  window.minimumPauseBetweenRequests = 10 //give the server (and the cpu) a little breather
  window.timeOfLastPhotoUpdate = new Date(0);
  window.pageLoadTime = new Date();
  window.debug = false;
  sendLogToServer('info','Client starting with ' + desiredSecondsPerPicture + 's/' + minimumPauseBetweenRequests + 's delays configured')
  getNextPhoto()

  if(window.debug)
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
  
  let now = new Date();
  
  var secondsElapsedSinceLastUpdate = Math.floor((now - timeOfLastPhotoUpdate) / 1000) 
  var secondsMissingToMatchDesiredWait = desiredSecondsPerPicture - secondsElapsedSinceLastUpdate
        
  var timeToWait = Math.max(secondsMissingToMatchDesiredWait,minimumPauseBetweenRequests)
        
  if(secondsElapsedSinceLastUpdate > 10000000) //first load
      timeToWait = 0 
  
  let minutesSincePageLoaded = (now - window.pageLoadTime) / (1000*60);
  
  if (minutesSincePageLoaded >= 60) {
    schedulePageReload(timeToWait * 1000);
  } else {
    try {
      var imgNode = $('<img class="the-photo" alt="If you can read this, something went terribly wrong.">')
      var requestTime = new Date()
      $.getJSON("feed?" + requestTime.getTime(), function( data ) {    
        imgNode.attr('src','data:image/jpeg;base64,' + data.photoData);
        var datetime = moment(new Date(parseInt(data.photoExif.tags.DateTimeOriginal) * 1000)).format('MMMM Do YYYY');
        var orientation = data.photoExif.tags.Orientation;
        var label = data.photoInfo.photos.photo[0].title;
        var msg =  label + '<br />' + datetime + '<br />Orientation: ' + orientation + '<br />Served at: ' + (new Date()).toLocaleTimeString();
        sendLogToServer('info',msg)
        
        var neededRotation = 0;
        if(orientation == 8) {
          neededRotation = 270; 
        } else if (orientation == 6)  {
          neededRotation = 90;
        }
        
        console.log('We\'ll wait ' + timeToWait + ' seconds before switching')
        schedulePhotoUpdate(imgNode, { caption: label, dateLabel: datetime }, neededRotation, timeToWait * 1000, msg)
      }).fail(function( jqxhr, textStatus, error ) {
          var photoRequestError = jqxhr.status + ": " + textStatus + ", " + error;
          if(jqxhr.status == 404) {
            console.log( "No photo found.  Retrying in 20 seconds.");
            schedulePhotoLoad(20000);
          } else {
            schedulePhotoLoad(30000,'HTTP error while retrieving photo: ' + photoRequestError);
          }
      });
    } catch(err) {
      schedulePhotoLoad(30000,'Unknown error while retrieving photo: ' + err);
    }
  }
}

function schedulePageReload(delay) {
  sendLogToServer('info','Client will reload page in ' + delay);
  setTimeout(function() {
    sendLogToServer('info','Client reloading page');
    window.location.reload();
  },delay)
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

function schedulePhotoUpdate(imgNode, imgInfo, rotation, delay, msg)  {
    
  setTimeout(
    function() {
      updatePhoto(imgNode, imgInfo, msg, rotation)
    }, 
    delay)
}

function updatePhoto(imgNode, imgInfo, debugMsg, rotation) {
  toastr.remove()
  $('.image-photo').empty()
  if(rotation && rotation != 0)  {
    imgNode.css("transform","rotate(" + rotation + "deg)");
    console.log('Rotated ' + rotation)
  }
  $('.image-photo').append(imgNode)
  window.timeOfLastPhotoUpdate = new Date()
  
  if(debugMsg && window.debug)
    toastr.info(debugMsg, { positionClass: "toast-bottom-left", showDuration: 30  })
  
  $(".image-captions .line1").empty();
  $(".image-captions .line2").empty();

  if(imgInfo && imgInfo.caption)
    $(".image-captions .line1").text(imgInfo.caption);

  if(imgInfo && imgInfo.dateLabel)
    $(".image-captions .line2").text(imgInfo.dateLabel);

  getNextPhoto();
}

function sendLogToServer(level, msg, extraInfo) {
  try { 
    console.log(msg)
    $.post('log', { level: level, msg: msg, extraInfo: extraInfo }) 
  } 
  catch (err) {
    console.log('Failed to log with server.  Must be down.')
    if(window.debug)
      toastr["warning"]("Failed to log with server.  Must be down.")
  }
}

window.onerror = function(errorMsg, url, lineNumber) {
    schedulePhotoLoad(20000,errorMsg)
    return false;
}