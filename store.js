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

    self.pointedPath = "";
    self.pointedFileNode = null;

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

    self.on("canvas_resized", function(width, height){
        self.width = width;
        self.height = height;
    });

    self.on("canvas_pointer_change", function(path, fileNode){
        self.pointedPath = path;
        self.pointedFileNode = fileNode;
        self.trigger("canvas_pointer_changed", self);       
    });

}

module.exports = Store;