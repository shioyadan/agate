//let fs = require("@electron/remote").require("fs");
let fs = require("fs");
let path = require("path");


class FileNode {
    constructor() {
        /** @type {Object<string,FileNode>} */
        this.children = {};
        /** @type {FileNode} */
        this.parent = null;
        this.key = "";  // ノードに対応するファイル名
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
    updateDirectorySize_(tree) {
        let size = 0;
        for(let key in tree.children) {
            let val = tree.children[key];
            if (val.isDirectory && val.children) {
                val.size = this.updateDirectorySize_(val);
            }
            size += val.size;
        }
        return size;
    };

    /** @param {FileNode} tree */
    updateDirectoryFileCount_(tree) {
        let fileCount = 0;
        for(let key in tree.children) {
            let val = tree.children[key];
            if (val.isDirectory && val.children) {
                val.fileCount = this.updateDirectoryFileCount_(val);
            }
            fileCount += val.fileCount;
        }
        return fileCount;
    };

    // path により指定したフォルダ以下のファイルツリーを取得
    // render プロセスで実行
    /**
     * 
     * @param {string} path 
     * @param {function(FileContext, FileNode): void} finishCallback 
     * @param {function(FileContext, string): void} progressCallback 
     */
    getFileTree(path, finishCallback, progressCallback) {

        let node = new FileNode;
        node.key = path;

        let context = new FileContext;
        context.progressCallback = progressCallback;
        context.tree = node;

        context.finishCallback = (finishContext, tree) => {
            // 各ディレクトリのサイズ反映
            this.updateDirectorySize_(tree);
            this.updateDirectoryFileCount_(tree);

            // 呼び出し元に返す
            finishCallback(finishContext, tree);
        },
        this.getFileTreeBody_(path, context, context.tree);

    };
        
    // getFileTree の実装
    // main プロセスで実行
    /**
     * @param {string} path 
     * @param {FileContext} context 
     * @param {FileNode} parent 
     */
    getFileTreeBody_(path, context, parent) {
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
                            self.getFileTreeBody_(
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

    /**
     * @param {FileNode} srcRoot 
     */
    export(pathRoot, srcRoot) {
        /**
         * @param {FileNode} dst 
         * @param {FileNode} src 
         */
        function process(dst, src) {
            dst.fileCount = src.fileCount;
            dst.isDirectory = src.isDirectory;
            dst.key = src.key;
            dst.size = src.size;
            dst.parent = null;  // Avoid circular dependency
            for (let i in src.children) {
                dst.children[i] = src.children[i];
                process(dst.children[i], src.children[i]);
            }
        }

        let dstRoot = new FileNode();
        process(dstRoot, srcRoot);

        let exportData = {
            absPath: path.resolve(pathRoot),
            tree: dstRoot
        }

        return JSON.stringify(exportData, null, "\t");
    }

    import(srcRoot, finishCallback) {
        /**
         * @param {FileNode} dst 
         * @param {FileNode} src 
         */
         function process(dst, src) {
            dst.fileCount = src.fileCount;
            dst.isDirectory = src.isDirectory;
            dst.key = src.key;
            dst.size = src.size;
            for (let i in src.children) {
                dst.children[i] = src.children[i];
                dst.children[i].parent = dst;
                process(dst.children[i], src.children[i]);
            }
        }

        let dstRoot = new FileNode();
        process(dstRoot, srcRoot["tree"]);
        finishCallback(dstRoot, srcRoot["absPath"]);
        return;
    }
};

// 直接実行された場合
if (require.main === module) {

    let targetPath = process.argv[2];
    //targetPath = "c:"

    if (!targetPath) {
        console.log(`Usage: node file_info.js <path_to_directory> > out.json`);
        process.exit(0);
    }
    let stats = fs.lstatSync(targetPath);
    if (!stats.isDirectory()) {
        console.log(`Error: ${targetPath} is not a valid directory.`);
        process.exit(1);
    }
    else {
        let fileInfo = new FileInfo();
        fileInfo.getFileTree(
            path.resolve(targetPath), 
            (context, node) =>{ // finish
                console.log(fileInfo.export(targetPath, node));
            },
            (context, path) => {    // progress
                process.stderr.write(".");
            }
        );
    }
}
else {
    module.exports.FileInfo = FileInfo;
    module.exports.FileNode = FileNode;
}

