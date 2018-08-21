run:
	electron --debug=5858 . 

init:
	npm install
	chmod 755 ./node_modules/license-checker/bin/license-checker

# 実行バイナリを作る
build: clean
	./node_modules/license-checker/bin/license-checker --production --relativeLicensePath > THIRD-PARTY-LICENSES.md
	electron-packager . agate \
		--out=packaging-work \
		--platform=darwin,win32,linux \
		--arch=x64  \
		--electron-version=1.7.5 \
		--ignore work \
		--ignore packaging-work \
		--prune=true	# Exclude devDependencies

# アーカイブに固める
DOCUMENTS = README.md LICENSE.md THIRD-PARTY-LICENSES.md
pack: build
	cp $(DOCUMENTS) -t ./packaging-work/
	cd packaging-work/; zip -r agate-win32-x64.zip agate-win32-x64 $(DOCUMENTS)
	cd packaging-work/; tar -cvzf agate-linux-x64.tar.gz agate-linux-x64 $(DOCUMENTS)
	cd packaging-work/; tar -cvzf agate-darwin-x64.tar.gz agate-darwin-x64 $(DOCUMENTS)

clean:
	rm packaging-work -r -f

distclean: clean
	rm node_modules -r -f
