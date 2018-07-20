# pickr
A flickr photo frame for raspberry pi with motion detection.  

The frame connects to 1 or more flickr accounts and displays photos in a random order.  It also supports connectivity with a PIR (passive infrared) sensor and automatically pauses photo viewing until someone re-enters the room (the screen is put to sleep).

## Installation
### Linux (with wifi and ssh enabled)
- Insert SD Card in linux box
  - `df -h` to see what's mounted
  - download raspbian `wget https://downloads.raspberrypi.org/raspbian_lite_latest`
  - `sudo dd bs=4M if=raspbian_lite_latest  of=/dev/sdb conv=fsync`
  - place a file ssh in /boot partition of the SD card
  - vi /etc/wpa_supplicant/wpa_supplicant.conf
```
network={
    ssid="testing"
    psk="testingPassword"
}
```

### node.js & pickr code

- https://raspberrypi.stackexchange.com/questions/4194/getting-npm-installed-on-raspberry-pi-wheezy-image/37976#37976
```
wget https://nodejs.org/dist/v4.2.4/node-v4.2.4-linux-armv6l.tar.gz
sudo mv node-v4.2.4-linux-armv6l.tar.gz /opt
cd /opt
sudo tar -xzf node-v4.2.4-linux-armv6l.tar.gz
sudo mv node-v4.2.4-linux-armv6l nodejs
sudo rm node-v4.2.4-linux-armv6l.tar.gz
sudo ln -s /opt/nodejs/bin/node /usr/bin/node
sudo ln -s /opt/nodejs/bin/npm /usr/bin/npm
sudo apt-get install git
cd ~
git clone https://github.com/SrGrieves/pickr.git
cd pickr/config
vi local.json
{
  "api_key": "BBB",
  "secret": "AAA",
  "user_id": "XYZ@N01",
  "access_token": "XXX",
  "access_token_secret": "XXX",
  "users": ["AAA@N02", "BBB@N02"],
  "prefix": null,
  "dailySleepAtMinutes": [],
  "dailyWakeAtMinutes": []
}
npm i
configure NODE_JS_HOME in /etc/profile
sudo npm i nodemon --global
```
### Setup systemctl service
```
sudo vi /lib/systemd/system/pickr.service
  [Unit]
  Description=pickr flickr photo frame source
  Documentation=https://github.com/SrGrieves/pickr
  After=network.target
  
  [Service]
  Environment=NODE_PORT=3001
  Type=simple
  User=pi
  ExecStart=/usr/bin/node /home/pi/pickr/app.js
  
  [Install]
  WantedBy=multi-user.target

sudo systemctl daemon-reload
sudo systemctl start pickr
sudo systemctl enable pickr
```

### Chromium
Chromium is used to view images

`sudo apt-get install -y chromium-browser ttf-mscorefonts-installer unclutter x11-xserver-utils matchbox-window-manager xinit`


### Setup autologin and autostart
```
sudo raspi-config` -> Boot Options -> Console Autologin
vi .xinitrc
  while true; do
  	# Clean up previously running apps, gracefully at first then harshly
  	killall -TERM chromium 2>/dev/null;
  	killall -TERM matchbox-window-manager 2>/dev/null;
  	sleep 2;
  	killall -9 chromium 2>/dev/null;
  	killall -9 matchbox-window-manager 2>/dev/null;
  
  	# Disable DPMS / Screen blanking
  	xset -dpms
  	xset s off
  
  	# Start the window manager (remove "-use_cursor no" if you actually want mouse interaction)
  	matchbox-window-manager -use_titlebar no -use_cursor no &
  
  	# Start the browser (See http://peter.sh/experiments/chromium-command-line-switches/)
  	#until [ $(systemctl is-active pickr) == "active"  ]; do
          #	echo -n .
          #	sleep 2
  	#done
  	#sleep 10
  	echo "Go for photo viewing!"
  	chromium --noerrdialogs --kiosk http://localhost:8080/viewer --incognito --v=1	
  	#midori -e Fullscreen -a http://localhost:8080/viewer
  	#WEBKIT_DISABLE_TBS=1 epiphany -a --profile /home/alarm/.config http://localhost:8080/viewer
  	
  done;

vi .bashrc
  ...
  if [ -z "$SSH_CLIENT" ]
  then
    startx -- -nocursor &> ~/startx.out
  fi
  ```
