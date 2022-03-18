"use strict";
let fs = require("fs");
let path = require("path");
let readline = require("readline");
let zlib = require("zlib");

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
        this.id = -1;
    }
}

class FileContext {
    constructor() {
        this.count = 0;

        /** @type {function(FileContext, FileNode): void} */
        this.finishCallback = null;

        /** @type {function(FileContext, string): void} */
        this.progressCallback = null;
        
        this.searchingFileNum = 0;
        this.searchingDirNum = 1;
        this.runningReadDirNum = 0;
        this.runningLstatNum = 0;
        this.sleepNum = 0;

        /** @type {FileNode} */
        this.tree = null;
        this.callCount = 0;

        this.mode = "";
    }
}

class FileInfo {
    constructor() {
        this.canceled = false;
        this.nextID_ = 1;
    }

    get nextID() {
        return this.nextID_;
    }

    // キャンセル
    Cancel() {
        this.canceled = true;
    }

    // tree で渡されてくるツリーにおいて，
    // 各ディレクトリが含む合計サイズを計算して適用する
    /**
     * @param {FileContext} context
     * @param {FileNode} tree 
     * */
    finalizeTree_(context, tree) {
        if (context.count % (1024*4) == 0) {
            context.progressCallback(context, tree.key);
        }
        context.count += 1;

        let sizeAndCount = [0,0];
        for(let key in tree.children) {
            let val = tree.children[key];
            if (val.isDirectory && val.children) {
                let child = this.finalizeTree_(context, val);
                val.size = child[0];
                val.fileCount = child[1];
            }
            sizeAndCount[0] += val.size;
            sizeAndCount[1] += val.fileCount;
        }
        return sizeAndCount;
    };

    // path により指定したフォルダ以下のファイルツリーを取得
    // render プロセスで実行
    /**
     * 
     * @param {string} path 
     * @param {function(FileContext, FileNode): void} finishCallback 
     * @param {function(FileContext, string): void} progressCallback 
     * @param {function(FileNode, FileNode): void?} connectionHook
     */
    getFileTree(path, finishCallback, progressCallback, connectionHook) {

        let node = new FileNode;
        node.key = path;
        node.isDirectory = true;
        node.id = this.nextID_;
        this.nextID_++;
        if (connectionHook) {
            connectionHook(null, node)
        }
        else {
            node.parent = null;
        }

        let context = new FileContext;
        context.mode = "get";
        context.progressCallback = progressCallback;
        context.tree = node;

        context.finishCallback = (finishContext, tree) => {
            // 各ディレクトリのサイズ反映
            context.mode = "finalize";
            context.count = 0;
            let sizeAndCount = this.finalizeTree_(context, tree);
            tree.size = sizeAndCount[0];
            tree.fileCount = sizeAndCount[1];

            // 呼び出し元に返す
            finishCallback(finishContext, tree);
        },
        this.getFileTreeBody_(path, context, context.tree, connectionHook);

    };

    /** 現在の lstat 実行数に応じて sleep した後に handler を呼ぶ
     * @param {FileContext} context 
     * @param {function} handler 
     */
    throttlingExecution_(context, handler) {
        let count = 0;
        context.sleepNum++;
        function process() {
            if (context.runningLstatNum < 10000) {
                context.sleepNum--;
                handler();
            }
            else {
                // Exponential back off + jitter
                let sleep = 100 + Math.random() * 200 * Math.pow(2, count);
                sleep = sleep > 2000 ? 2000 : sleep;
                count++;
                setTimeout(() => {process()}, sleep);
            }
        }
        process();
    }

    // getFileTree の実装
    // main プロセスで実行
    /**
     * @param {string} path 
     * @param {FileContext} context 
     * @param {FileNode} parent 
     * @param {function(FileNode, FileNode): void} connectionHook
     */
    getFileTreeBody_(path, context, parent, connectionHook) {
        let self = this;
        context.callCount += 1;

        if (this.canceled) {
            return;
        }

        context.runningReadDirNum++;
        fs.readdir(path, (err, files) => {
            context.runningReadDirNum--;
            // エラーでも探索対象に入っているので
            // 探索済みにカウントする必要がある
            context.searchingDirNum -= 1;

            if (err) {
                //console.log(err);
                return;
            }

            // 処理を終わらせないために，残り探索対象数は判明次第直ちに足す必要がある
            context.searchingFileNum += files.length;

            // メモリ使用量を抑えるため，lstat 起動数が多すぎる場合はここでスリープさせる
            this.throttlingExecution_(context, () => {  

                files.forEach((pathElement) => {
                    let filePath = path + "/" + pathElement;
                    // メモリ使用量を抑えるため，lstat 起動数が多すぎる場合はここでスリープさせる
                    this.throttlingExecution_(context, () => {

                        context.runningLstatNum++;
                        fs.lstat(filePath, (err, stat) => {
                            context.runningLstatNum--;

                            if (err) {
                                //console.log(err);
                            }
                            else{
                                // ファイル情報ノード作成
                                let node = new FileNode;
                                node.id = this.nextID_;
                                this.nextID_++;

                                node.size = stat.size;
                                node.isDirectory = stat.isDirectory();
                                node.key = pathElement;
                                node.children = (stat.isDirectory() && !stat.isSymbolicLink()) ? {} : null;

                                if (connectionHook) {
                                    connectionHook(parent, node)
                                }
                                else {
                                    parent.children[pathElement] = node;
                                    node.parent = parent;
                                }

                                if (node.children) {
                                    // 処理を終わらせないために，残り探索対象数は判明次第直ちに足す必要がある
                                    context.searchingDirNum++;
                                    self.getFileTreeBody_(filePath, context, node, connectionHook);
                                }
                            }

                            context.count++;
                            context.searchingFileNum -= 1;

                            // 残り探索対象がなくなったので終了する
                            if (context.searchingFileNum == 0 && context.searchingDirNum == 0){
                                // Electron のリモート呼び出しは浅いコピーしかしないので
                                // JSON にシリアライズしておくる
                                //context.callback(context, JSON.stringify(context.tree));

                                context.finishCallback(context, context.tree);
                            }

                            // 現在の状態の更新
                            if (context.count % (1024*4) == 0) {
                                context.progressCallback(context, filePath);
                                //process.stderr.write(`[files:${context.searchingFileNum},dirs:${context.searchingDirNum},rddir:${context.runningReadDirNum},lstat:${context.runningLstatNum},sleep:${context.sleepNum},${path}]\n`);
                            }
                        });
                    });
                });
            });
        });
    };

    /**
     * @param {FileNode} parent 
     * @param {FileNode} node 
     */
    encode(parent, node) {
        return `${node.id}\t${parent ? parent.id : 0}\t${node.key}\t${node.isDirectory?1:0}\t${node.fileCount}\t${node.size}\n`;
    }
 
    /**
     * タブ区切りテキストにノードの情報をダンプしていく
     * @param {FileNode} srcRoot 
     */
    export(srcRoot) {
        // 各ノードに id をふり，各ノードは自分の親の id をダンプする
        // id=0 は存在しないルートノードとなる
        /** @param {FileNode} node */
        function traverse(node) {
            process.stdout.write(this.encode(node.parent, node));
            for (let i in node.children) {
                traverse(node.children[i]);
            }
        }
        traverse(srcRoot);
    }

    import(fileName, finishCallback, progressCallback) {
        let rs = fs.createReadStream(fileName, {highWaterMark: 1024*64});
        let rl;

        if (path.extname(fileName) == ".gz") {
            let gzipRS = rs.pipe(zlib.createGunzip({chunkSize: 1024*32}));
            rl = readline.createInterface({"input": gzipRS});
        }
        else {
            rl = readline.createInterface({"input": rs});
        }

        // 各ノードに id をふり，各ノードは自分の親の id をダンプする
        // id=0 は実際には存在しない仮のルートノードとなる
        let idToNodeMap = {};
        idToNodeMap[0] = new FileNode();

        let lineNum = 1;
        let context = new FileContext;
        context.mode = "import";
        context.progressCallback = progressCallback;
        
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

            if (lineNum % (1024 * 128) == 0) {
                context.count = lineNum;
                progressCallback(context, node.key);
            }
            lineNum++;
        });
        rl.on("close", () => {
            // id=0 は実際には存在しないルートのノードなので，取り除く
            let keys = Object.keys(idToNodeMap[0].children);
            let root = idToNodeMap[0].children[keys[0]];
            root.parent = null;

            let context = new FileContext();
            context.progressCallback = progressCallback;
            context.mode = "finalize";
            context.count = 0;

            let sizeAndCount = this.finalizeTree_(context, root);
            root.size = sizeAndCount[0];
            root.fileCount = sizeAndCount[1];

            finishCallback(lineNum, root);
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
                //fileInfo.export(node);
                console.log(`finished (lastID:${fileInfo.nextID-1})`);
                process.stderr.write("finished");
            },
            (context, path) => {    // progress
                process.stderr.write(".");
            },
            (parent, node) => {
                process.stdout.write(fileInfo.encode(parent, node));
            }
        );
    }
}
else {
    module.exports.FileInfo = FileInfo;
    module.exports.FileNode = FileNode;
    module.exports.FileContext = FileContext;
}

