# Agate

* ディスクの使用状況を可視化します．
* 実行バイナリについては [こちら](https://github.com/shioyadan/agate/releases)
からダウンロードしてください．Windows，Linux，Mac に対応しています．
* 動作例：

![demo](https://github.com/shioyadan/agate/wiki/images/agate.gif)


## 使い方

* ホイールアップ or ダブルクリック: 拡大
* ホイールダウン or  shift + ダブルクリック: 縮小
* 右クリック: ポイントしたフォルダを開く

## コマンドライン実行によるファイルのスキャン

* GUI を起動するのが難しい場合，node.js で file_info.js を実行してスキャン結果をダンプし，それを読み込むことが出来る
*  以下のようにして生成したダンプ（gzip 推奨）を，GUI の "Import a file" より読み込む
    ```
    node file_info.js <スキャン対象のパス> | gzip > out.log
    ```
## 開発

    # Install node.js/npm
    sudo apt install nodejs

    # Run and build
    make init   # Setup libraries
    make        # Run agate
    make pack   # Build & pack Agate for Windows/Linux/Mac

## その他
agate は瑪瑙の意味．

## License

Copyright (C) 2016-2020 Ryota Shioya <shioya@ci.i.u-tokyo.ac.jp>

This application is released under the 3-Clause BSD License, see LICENSE.md.
This application bundles ELECTRON and many third-party packages in accordance with 
the licenses presented in THIRD-PARTY-LICENSES.md.
