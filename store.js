function Store(){
    /* globals riot FileInfo */
    riot.observable(this);

    let self = this;

    self.tree = null;
    self.treeFolderName = "";
    self.treeLoadState = null;
    self.treeCurrentLoadingFileName = "";

    self.width = 0;
    self.height = 0;

    self.fileInfo_ = new FileInfo();

    self.on("tree_load", function(folderName) {
        self.treeFolderName = folderName;

        self.fileInfo_.getFileTree(
            folderName,
            function(state, tree) {
                // 読み込み終了
                self.tree = tree;
                self.treeLoadState = state;
                self.trigger("tree_loaded", self);       
            },
            function(state, filePath) {
                // 読み込み状態の更新
                self.treeLoadState = state;
                self.treeCurrentLoadingFileName = filePath;
                self.trigger("tree_loading", self);       
            }
        );
    });
}

module.exports = Store;
