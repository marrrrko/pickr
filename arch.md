

Install from http://roguephysicist.github.io/RasPi2-Kiosk/
pacman -Syu --noconfirm # system updates, may take a little while
pacman -S htop vim wget --noconfirm # useful utils
pacman -S xorg-server xorg-server-utils xorg-xinit --noconfirm # basic X11 packages
pacman -S alsa-utils xf86-video-fbturbo --noconfirm # RasPi 2 sound and video drivers
pacman -S matchbox-window-manager --noconfirm # super lightweight WM
pacman -S midori unclutter --noconfirm # unclutter hides your cursor
pacman -S ttf-dejavu --noconfirm # set of nice fonts




pacman -S raspberrypi-firmware-tools to get vcgencmd


tzselect to setup timezone...  > ln -sf /usr/share/zoneinfo/America/Toronto /etc/localtime