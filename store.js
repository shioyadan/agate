const ACTION = {
    TREE_LOAD: 0,
    TREE_LOADED: 1,
    TREE_LOADING: 2,
    CANVAS_RESIZED: 3,
    CANVAS_POINTER_CHANGE: 4,
    CANVAS_POINTER_CHANGED: 5,
    CANVAS_ZOOM_IN: 6,
    CANVAS_ZOOM_OUT: 7,
    FOLDER_OPEN: 8,
};

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

    self.on(ACTION.TREE_LOAD, function(folderName) {
        self.treeFolderName = folderName;

        self.fileInfo_.getFileTree(
            folderName,
            function(state, tree) {
                // 読み込み終了
                self.tree = tree;
                self.treeLoadState = state;
                self.trigger(ACTION.TREE_LOADED, self);       
            },
            function(state, filePath) {
                // 読み込み状態の更新
                self.treeLoadState = state;
                self.treeCurrentLoadingFileName = filePath;
                self.trigger(ACTION.TREE_LOADING, self);       
            }
        );
    });

    self.on(ACTION.CANVAS_RESIZED, function(width, height){
        self.width = width;
        self.height = height;
    });

    self.on(ACTION.CANVAS_POINTER_CHANGE, function(path, fileNode){
        self.pointedPath = path;
        self.pointedFileNode = fileNode;
        self.trigger(ACTION.CANVAS_POINTER_CHANGED, self);       
    });
}


module.exports = Store;
