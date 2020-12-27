const {FileInfo} = require("./file_info.js");

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

const CHANGE = {
};


class Store {
    constructor() {
        this.handlers_ = {};

        this.tree = null;
        this.treeFolderName = "";
        this.treeLoadState = null;
        this.treeCurrentLoadingFileName = "";

        this.width = 0;
        this.height = 0;

        this.pointedPath = "";
        this.pointedFileNode = null;

        this.fileInfo_ = new FileInfo();

        this.on(ACTION.TREE_LOAD, (folderName) => {
            this.treeFolderName = folderName;

            this.fileInfo_.getFileTree(
                folderName,
                (state, tree) => {
                    // 読み込み終了
                    this.tree = tree;
                    this.treeLoadState = state;
                    this.trigger(ACTION.TREE_LOADED, this);       
                },
                (state, filePath)  => {
                    // 読み込み状態の更新
                    this.treeLoadState = state;
                    this.treeCurrentLoadingFileName = filePath;
                    this.trigger(ACTION.TREE_LOADING, this);       
                }
            );
        });

        this.on(ACTION.CANVAS_RESIZED, (width, height) => {
            this.width = width;
            this.height = height;
        });

        this.on(ACTION.CANVAS_POINTER_CHANGE, (path, fileNode) => {
            this.pointedPath = path;
            this.pointedFileNode = fileNode;
            this.trigger(ACTION.CANVAS_POINTER_CHANGED, this);       
        });

    }

    on(event, handler) {
        if (!event) {
            console.log(`Unknown event ${event}`);            
        }
        if (!(event in this.handlers_ )) {
            this.handlers_[event] = [];
        }
        this.handlers_[event].push(handler);
    }

    trigger(event, ...args) {
        if (!event) {
            console.log(`Unknown event ${event}`);            
        }
        if (event in this.handlers_) {
            let handlers = this.handlers_[event];
            for (let h of handlers) {
                h.apply(null, args);
            }
        }
    }

    get ACTION(){
        return ACTION;
    }
    get CHANGE(){
        return CHANGE;
    }
}


module.exports.Store = Store;
module.exports.ACTION = ACTION;
module.exports.CHANGE = CHANGE;
