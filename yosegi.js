var yosegi = {

    // レンダラで実行
    getFileList: function(path, callback) {
        // main プロセスで getFileListBody を呼び出す
        var remote = require("electron").remote.require("./yosegi");
        //var yosegi = require("./yosegi");
        
        remote.getFileListOnMain(path, callback);
    },

    // 初回
    getFileListOnMain: function(path, callback) {

        var context = {
            count: 0,
            callback: callback,
            finish: false,
            searching: 0,
            searchingDir: 1,
            tree: {}
        };

        yosegi.getFileListOnMainBody(path, context, context.tree);
    },
        
    // リモートで実行
    getFileListOnMainBody: function(path, context, parent) {
        //var fs = require("electron").remote.require("fs");
        var fs = require("fs");

        fs.readdir(path, function(err, files) {
            if (err) {
                //console.log(err);
                return;
            }
            
            context.searching += files.length;
            context.searchingDir -= 1;

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
                            yosegi.getFileListOnMainBody(
                                filePath, context, node.children
                            );
                        }
                    }

                    context.count++;
                    context.searching -= 1;
                    if (context.searching == 0 && context.searchingDir == 0) {
                        context.finish = false;
                        // JSON にシリアライズしておくる
                        context.callback(context, JSON.stringify(context.tree));
                    }
                });
            });

        });
    }
};  // var yosegi = {}


module.exports = yosegi;
