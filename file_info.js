class FileNode {
    constructor() {
        /** @type {Object<string,FileNode>} */
        this.children = {};
        /** @type {FileNode} */
        this.parent = null;
        this.key = "";
        this.size = 0;
        this.fileCount = 1;
        this.isDirectory = false;
    }
}

class FileContext {
    constructor() {
        this.count = 0;
        this.finishCallback = null;
        this.progressCallback = null;
        this.searching = 0;
        this.searchingDir = 1;
        /** @type {FileNode} */
        this.tree = null;
        this.callCount = 0;
    }
}

class FileInfo {
    constructor() {
        this.canceled = false;
    }

    // キャンセル
    Cancel() {
        this.canceled = true;
    }

    // tree で渡されてくるツリーにおいて，
    // 各ディレクトリが含む合計サイズを計算して適用する
    /** @param {FileNode} tree */
    updateDirectorySize(tree) {
        let size = 0;
        for(let key in tree.children) {
            let val = tree.children[key];
            if (val.isDirectory && val.children) {
                val.size = this.updateDirectorySize(val);
            }
            size += val.size;
        }
        return size;
    };

    /** @param {FileNode} tree */
    updateDirectoryFileCount(tree) {
        let fileCount = 0;
        for(let key in tree.children) {
            let val = tree.children[key];
            if (val.isDirectory && val.children) {
                val.fileCount = this.updateDirectoryFileCount(val);
            }
            fileCount += val.fileCount;
        }
        return fileCount;
    };

    // path により指定したフォルダ以下のファイルツリーを取得
    // render プロセスで実行
    getFileTree(path, finishCallback, progressCallback) {
        let self = this;
        // main プロセスで getFileListBody を呼び出す
        //let remote = require("electron").remote.require("./file_info");
        //remote.getFileTreeOnMain(path, function(context, treeJSON) {

        self.getFileTreeOnMain(
            path, 
            function(context, treeJSON){
                // JSON にシリアライズされて送られてくるので，展開する
                //tree = JSON.parse(treeJSON);
                let tree = treeJSON;

                // 各ディレクトリのサイズ反映
                self.updateDirectorySize(tree);
                self.updateDirectoryFileCount(tree);

                // 呼び出し元に返す
                finishCallback(context, tree);
            },
            progressCallback
        );
    };

    // getFileTree の実装のエントリポイント
    // main プロセスで実行
    getFileTreeOnMain(path, finishCallback, progressCallback) {
        let self = this;
        let node = new FileNode;
        node.key = path;

        let context = new FileContext;
        context.finishCallback = finishCallback;
        context.progressCallback = progressCallback;
        context.tree = node;
        self.getFileTreeOnMainBody(path, context, context.tree);
    };
        
    // getFileTree の実装
    // main プロセスで実行
    /**
     * @param {string} path 
     * @param {FileContext} context 
     * @param {FileNode} parent 
     */
    getFileTreeOnMainBody(path, context, parent) {
        let self = this;
        context.callCount += 1;

        if (this.canceled) {
            return;
        }

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

        fs.readdir(path, function(err, files){
            // エラーでも探索対象に入っているので
            // 探索済みにカウントする必要がある
            context.searchingDir -= 1;

            if (err) {
                //console.log(err);
                return;
            }
            
            context.searching += files.length;

            files.forEach(function(pathElement){
                let filePath = path + "/" + pathElement;

                fs.lstat(filePath, function(err, stat){

                    if (err) {
                        //console.log(err);
                    }
                    else{
                        // ファイル情報ノード作成
                        let node = new FileNode;
                        node.size = stat.size;
                        node.isDirectory = stat.isDirectory();
                        node.children = null;
                        node.parent = parent;
                        node.key = pathElement;

                        parent.children[pathElement] = node;
                        if (stat.isDirectory() && !stat.isSymbolicLink()) {
                            node.children = {};
                            context.searchingDir++;
                            self.getFileTreeOnMainBody(
                                filePath, context, node
                            );
                        }
                    }

                    context.count++;
                    context.searching -= 1;

                    if (context.count % (1024*4) == 0) {
                        context.progressCallback(context, filePath);
                    }

                    if (context.searching == 0 && context.searchingDir == 0){
                        // Electron のリモート呼び出しは浅いコピーしかしないので
                        // JSON にシリアライズしておくる
                        //context.callback(context, JSON.stringify(context.tree));

                        context.finishCallback(context, context.tree);
                    }
                });
            });

        });
    };
};

module.exports.FileInfo = FileInfo;
module.exports.FileNode = FileNode;
