run:
	electron --debug=5858 . 
pack:
	electron-packager . agate --out=packaging-work --platform=darwin,win32,linux --arch=x64 --version=1.4.13

clean:
	rm packaging-work -r -f
