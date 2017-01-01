function FileInfo(){
    return this;
}

// tree で渡されてくるツリーにおいて，
// 各ディレクトリが含む合計サイズを計算して適用する
FileInfo.prototype.updateDirectorySize = function(tree){
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

// path により指定したフォルダ以下のファイルツリーを取得
// render プロセスで実行
FileInfo.prototype.getFileTree = function(path, finishCallback, pogressCallback){
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

            // 呼び出し元に返す
            finishCallback(context, tree);
        },
        pogressCallback
    );
};

// getFileTree の実装のエントリポイント
// main プロセスで実行
FileInfo.prototype.getFileTreeOnMain = function(path, finishCallback, pogressCallback){
    let self = this;
    let context = {
        count: 0,
        finishCallback: finishCallback,
        pogressCallback: pogressCallback,
        searching: 0,
        searchingDir: 1,
        tree: {
            children: {},
            parent: null,
            key: path,
            size: 0,
            isDirectory: false,
        },
        callCount: 0,
    };

    self.getFileTreeOnMainBody(path, context, context.tree);
},
    
// getFileTree の実装
// main プロセスで実行
FileInfo.prototype.getFileTreeOnMainBody = function(path, context, parent){
    let self = this;
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

            fs.stat(filePath, function(err, stat){

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
                    };
                    parent.children[pathElement] = node;

                    if (stat.isDirectory()) {
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
                    context.pogressCallback(context, filePath);
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

module.exports = FileInfo;
