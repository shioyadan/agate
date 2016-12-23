/*
var electron = require("electron");  // Module to control application life.
var remote = electron.remote;
var fs = remote.require("fs");
*/
var fs = require("fs");

var yosegi = {};

// 
yosegi.getFileList = function(path, callback) {
    var context = {
        searching: 0,
        count: 0,
        callback: callback,
        tree: {}
    };
    yosegi.getFileListBody(path, context, context.tree);
}

yosegi.getFileListBody = function(path, context, parent) {
    fs.readdir(path, function(err, files) {
        context.searching += files.length;

        files.forEach(function(val, i) {
            var filePath = path + "/" + val;
            fs.stat(filePath, function(err, stat) {

                if (err) {
                    //
                }
                else{
                    // ファイル情報ノード作成
                    var node = {
                        size: stat.size,
                        isDirectory: stat.isDirectory(),
                        children: null
                    };
                    parent[filePath] = node;

                    if (stat.isDirectory()) {
                        node.children = {};
                        yosegi.getFileListBody(filePath, context, node.children)
                    }
                }

                context.count++;
                context.searching -= 1;
                if (context.searching == 0) {
                    context.callback(context.tree);
                }
            });
        });

    });
};

module.exports = yosegi;
