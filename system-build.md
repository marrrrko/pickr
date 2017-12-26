Install Linux on SD Card with wifi and ssh enabled
===================================
- Insert SD Card in linux box
  - `df -h` to see what's mounted
  - download raspbian `wget https://downloads.raspberrypi.org/raspbian_lite_latest`
  - `sudo dd bs=4M if=raspbian_lite_latest  of=/dev/sdb conv=fsync`
  - place a file ssh in /boot partition of the SD card
  - vi /etc/wpa_supplicant/wpa_supplicant.conf

network={
    ssid="testing"
    psk="testingPassword"
}
  
Install node.js & checkout code
===================================
https://raspberrypi.stackexchange.com/questions/4194/getting-npm-installed-on-raspberry-pi-wheezy-image/37976#37976

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
  "api_key": "644eb643ee26a55307f2dac7eb480953",
  "secret": "50299b0000be21a5",
  "user_id": "10135324@N07",
  "access_token": "72157662544844611-a7c01896578e0d5f",
  "access_token_secret": "6a0074eaaa60571e",
  "users": ["10135324@N07", "96539968@N02"],
  "prefix": null,
  "dailySleepAtMinutes": [],
  "dailyWakeAtMinutes": []
}

npm i


configure NODE_JS_HOME in /etc/profile

sudo npm i nodemon --global




Install chromium
===================================

sudo apt-get install -y chromium-browser ttf-mscorefonts-installer unclutter x11-xserver-utils


Setup autologin and autostart
===================================
`sudo raspi-config` -> Boot Options -> Console Autologin




Add stuff for turning screen off
===================================




Add stuff for GPIO
===================================




Make drive read-only
===================================
https://www.raspberrypi.org/forums/viewtopic.php?t=161416