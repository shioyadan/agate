var fileInfo = {

    // tree で渡されてくるツリーにおいて，
    // 各ディレクトリが含む合計サイズを計算して適用する
    updateDirectorySize: function(tree) {
        var size = 0;
        for(var key in tree) {
            var val = tree[key];
            if (val.isDirectory && val.children) {
                val.size = fileInfo.updateDirectorySize(val.children);
            }
            size += val.size;
        }
        return size;
    },

    // path により指定したフォルダ以下のファイルツリーを取得
    // render プロセスで実行
    getFileTree: function(path, callback) {
        // main プロセスで getFileListBody を呼び出す
        var remote = require("electron").remote.require("./file_info");
        remote.getFileTreeOnMain(path, function(context, treeJSON) {
            // JSON にシリアライズされて送られてくるので，展開する
            tree = JSON.parse(treeJSON);

            // 各ディレクトリのサイズ反映
            fileInfo.updateDirectorySize(tree);

            // 呼び出し元に返す
            callback(context, tree);
        });
    },

    // getFileTree の実装のエントリポイント
    // main プロセスで実行
    getFileTreeOnMain: function(path, callback) {

        var context = {
            count: 0,
            callback: callback,
            finish: false,
            searching: 0,
            searchingDir: 1,
            tree: {},
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
        if (context.callCount % 2 == 0) {
            setTimeout(
                function() {
                    fileInfo.getFileTreeOnMainBody(path, context, parent);
                },
                1000
            );
            return;
        }*/

        //var fs = require("electron").remote.require("fs");
        var fs = require("fs");

        fs.readdir(path, function(err, files) {
            // エラーでも探索対象に入っているので
            // 探索済みにカウントする必要がある
            context.searchingDir -= 1;

            if (err) {
                //console.log(err);
                return;
            }
            
            context.searching += files.length;

            files.forEach(function(pathElement, i) {
                var filePath = path + "/" + pathElement;

                fs.stat(filePath, function(err, stat) {

                    if (err) {
                        //console.log(err);
                    }
                    else{
                        // ファイル情報ノード作成
                        var node = {
                            size: stat.size,
                            isDirectory: stat.isDirectory(),
                            children: null
                        };
                        parent[pathElement] = node;

                        if (stat.isDirectory()) {
                            node.children = {};
                            context.searchingDir++;
                            fileInfo.getFileTreeOnMainBody(
                                filePath, context, node.children
                            );
                        }
                    }

                    context.count++;
                    context.searching -= 1;

                    
                    if (context.searching == 0 && context.searchingDir == 0) {
                        context.finish = false;
                        // Electron のリモート呼び出しは浅いコピーしかしないので
                        // JSON にシリアライズしておくる
                        context.callback(context, JSON.stringify(context.tree));
                    }
                });
            });

        });
    }
};  // var file_info = {}


module.exports = fileInfo;
