let fileInfo = {

    // tree で渡されてくるツリーにおいて，
    // 各ディレクトリが含む合計サイズを計算して適用する
    updateDirectorySize: function(tree) {
        let size = 0;
        for(let key in tree.children) {
            let val = tree.children[key];
            if (val.isDirectory && val.children) {
                val.size = fileInfo.updateDirectorySize(val);
            }
            size += val.size;
        }
        return size;
    },

    // path により指定したフォルダ以下のファイルツリーを取得
    // render プロセスで実行
    getFileTree: function(path, callback) {
        // main プロセスで getFileListBody を呼び出す
        //let remote = require("electron").remote.require("./file_info");
        //remote.getFileTreeOnMain(path, function(context, treeJSON) {

        fileInfo.getFileTreeOnMain(path, function(context, treeJSON) {

            // JSON にシリアライズされて送られてくるので，展開する
            //tree = JSON.parse(treeJSON);
            let tree = treeJSON;

            // 各ディレクトリのサイズ反映
            fileInfo.updateDirectorySize(tree);

            // 呼び出し元に返す
            callback(context, tree);
        });
    },

    // getFileTree の実装のエントリポイント
    // main プロセスで実行
    getFileTreeOnMain: function(path, callback) {

        let context = {
            count: 0,
            callback: callback,
            finish: false,
            searching: 0,
            searchingDir: 1,
            tree: {
                children: {},
                parent: null
            },
            callCount: 0,
        };

        fileInfo.getFileTreeOnMainBody(path, context, context.tree);
    },
        
    // getFileTree の実装
    // main プロセスで実行
    getFileTreeOnMainBody: function(path, context, parent) {

        context.callCount += 1;
        /*
        if (context.callCount % (1024) == 0) {
            console.log("" + context.count + "," + context.searchingDir + "," + context.searching);
        }
        */
        /*
        if (context.callCount > 16) {
            if  (context.searching == 0) {
                context.callCount = 0;
            }
            else{
                setTimeout(
                    function() {
                        fileInfo.getFileTreeOnMainBody(path, context, parent);
                    },
                    100
                );
                return;
            }
        }*/

        //let fs = require("electron").remote.require("fs");
        let fs = require("fs");

        fs.readdir(path, function(err, files) {
            // エラーでも探索対象に入っているので
            // 探索済みにカウントする必要がある
            context.searchingDir -= 1;

            if (err) {
                //console.log(err);
                return;
            }
            
            context.searching += files.length;

            files.forEach(function(pathElement) {
                let filePath = path + "/" + pathElement;

                fs.stat(filePath, function(err, stat) {

                    if (err) {
                        //console.log(err);
                    }
                    else{
                        // ファイル情報ノード作成
                        let node = {
                            size: stat.size,
                            isDirectory: stat.isDirectory(),
                            children: null,
                            parent: parent,
                            key: pathElement,
                            treeMapCache: null   // ツリーマップのキャッシュに使うスタブ
                        };
                        parent.children[pathElement] = node;

                        if (stat.isDirectory()) {
                            node.children = {};
                            context.searchingDir++;
                            fileInfo.getFileTreeOnMainBody(
                                filePath, context, node
                            );
                        }
                    }

                    context.count++;
                    context.searching -= 1;

                    
                    // if ((context.searching == 0 && context.searchingDir == 0) || 
                    //    (context.count % (1024*4) == 0)) {
                    if (context.searching == 0 && context.searchingDir == 0){
                        context.finish = false;
                        // Electron のリモート呼び出しは浅いコピーしかしないので
                        // JSON にシリアライズしておくる
                        //context.callback(context, JSON.stringify(context.tree));

                        context.callback(context, context.tree);
                    }
                });
            });

        });
    }
};  // let file_info = {}

module.exports = fileInfo;
