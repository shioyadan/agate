run:
	npx electron . 

init:
	npm install

# 実行バイナリを作る
build: clean
	npx license-checker --production --relativeLicensePath > THIRD-PARTY-LICENSES.md
	npx electron-packager . agate \
		--out=packaging-work \
		--platform=darwin,win32,linux \
		--arch=x64  \
		--electron-version=27.0.3 \
		--ignore work \
		--ignore packaging-work \
		--ignore "\\.vscode$$" \
		--ignore "\\.log$$" \
		--ignore "\\.gz$$" \
		--asar  \
		--prune=true	# Exclude devDependencies
	$(MAKE) build-file-info


# pkg を使って file_info.js のバイナリを生成する
build-file-info:
	npx pkg -t node16-linux-x64 --out-path=packaging-work/agate-linux-x64 file_info.js
	npx pkg -t node16-win-x64 --out-path=packaging-work/agate-win32-x64 file_info.js
	npx pkg -t node16-macos-x64 --out-path=packaging-work/agate-darwin-x64 file_info.js

# home の全情報をコマンドラインから取る
run-file-info:
	nodejs --max-old-space-size=8192 file_info.js /home | gzip > home-all.$(shell date +%Y%m%d).log.gz

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

