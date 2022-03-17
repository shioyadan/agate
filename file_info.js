"use strict";
let fs = require("fs");
let path = require("path");
let readline = require("readline");


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
        node.isDirectory = true;

        let context = new FileContext;
        context.progressCallback = progressCallback;
        context.tree = node;

        context.finishCallback = (finishContext, tree) => {
            // 各ディレクトリのサイズ反映
            tree.size = this.updateDirectorySize_(tree);
            tree.fileCount = this.updateDirectoryFileCount_(tree);

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
     * タブ区切りテキストにノードの情報をダンプしていく
     * @param {FileNode} srcRoot 
     */
    export(srcRoot) {
        // 各ノードに id をふり，各ノードは自分の親の id をダンプする
        // id=0 は存在しないルートノードとなる
        let nextID = 1;
        /** @param {FileNode} src */
        function traverse(src, parentID) {
            let nodeID = nextID;
            process.stdout.write(`${nodeID}\t${parentID}\t${src.key}\t${src.isDirectory?1:0}\t${src.fileCount}\t${src.size}\n`);
            nextID++;
            for (let i in src.children) {
                traverse(src.children[i], nodeID);
            }
        }

        traverse(srcRoot, 0);
    }

    import(fileName, finishCallback) {
        let rs = fs.createReadStream(fileName, {highWaterMark: 1024*64});
        let rl = readline.createInterface({"input": rs});

        // 各ノードに id をふり，各ノードは自分の親の id をダンプする
        // id=0 は実際には存在しない仮のルートノードとなる
        let idToNodeMap = {};
        idToNodeMap[0] = new FileNode();
        
        rl.on("line", (line) => {
            let node = new FileNode();

            // process.stdout.write(`${id}\t${parent}\t${src.key}\t${src.isDirectory?1:0}\t${src.fileCount}\t${src.size}\n`);
            let args = line.split(/\t/);
            let id = Number(args[0]);
            let parentID = Number(args[1]);

            idToNodeMap[id] = node;
            node.key = args[2];
            node.isDirectory = Number(args[3]) == 1 ? true : false;
            node.fileCount = Number(args[4])
            node.size = Number(args[5]);
            node.children = null;   // 子供がない場合は null に

            // 親 -> 子の接続
            if (parentID in idToNodeMap) {
                let parentNode = idToNodeMap[parentID];
                node.parent = parentNode;
                if (!parentNode.children) {
                    parentNode.children = {};
                }
                parentNode.children[node.key] = node;
            }
            else {
                console.log(`Invalid parent id: ${parentID}`);
            }
        });
        rl.on("close", () => {
            // id=0 は実際には存在しないルートのノードなので，取り除く
            let keys = Object.keys(idToNodeMap[0].children);
            let root = idToNodeMap[0].children[keys[0]];
            root.parent = null;
            finishCallback(root, root.key);
        });
    }
};

// 直接実行された場合
if (require.main === module) {

    let targetPath = process.argv[2];
    // targetPath = "./"

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
                // console.log(fileInfo.export(targetPath, node));
                fileInfo.export(node);
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

