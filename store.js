const {FileInfo} = require("./file_info.js");

const ACTION = {
    TREE_LOAD: 1,
    TREE_IMPORT: 2,
    FOLDER_OPEN: 3,
    FILE_IMPORT: 4,
    CANVAS_RESIZED: 5,
    CANVAS_POINTER_CHANGE: 6,
    CANVAS_ZOOM_IN: 7,
    CANVAS_ZOOM_OUT: 8,
    MODE_CHANGE: 9,
};

const CHANGE = {
    TREE_LOADED: 100,
    TREE_LOADING: 101,
    TREE_RELEASED: 102,
    TREE_MODE_CHANGED: 103,
    FOLDER_OPEN: 104,
    FILE_IMPORT: 105,
    CANVAS_ZOOM_IN: 106,
    CANVAS_ZOOM_OUT: 107,
    CANVAS_POINTER_CHANGED: 108,
};


class Store {
    constructor() {
        this.handlers_ = {};

        this.tree = null;
        this.width = 0;
        this.height = 0;

        this.pointedPath = "";
        this.pointedFileNode = null;

        this.fileInfo_ = new FileInfo();

        this.isSizeMode = true;

        this.on(ACTION.TREE_LOAD, (folderName) => {
            this.fileInfo_.Cancel();
            this.fileInfo_ = new FileInfo();
            this.trigger(CHANGE.TREE_RELEASED);

            this.fileInfo_.getFileTree(
                folderName,
                (context, tree) => {
                    // 読み込み終了
                    this.tree = tree;
                    this.trigger(CHANGE.TREE_LOADED, this, context, folderName);       
                },
                (context, filePath)  => {
                    // 読み込み状態の更新
                    this.trigger(CHANGE.TREE_LOADING, this, context, filePath);       
                },
                null
            );
        });

        this.on(ACTION.TREE_IMPORT, (fileName) => {
            this.fileInfo_.Cancel();
            this.fileInfo_ = new FileInfo();
            this.trigger(CHANGE.TREE_RELEASED);

            this.fileInfo_.import(
                fileName, 
                (context, tree) => { // finish handler
                    this.tree = tree;
                    this.trigger(CHANGE.TREE_LOADED, this, context, fileName);       
                },
                (context, filePath)  => {
                    // 読み込み状態の更新
                    this.trigger(CHANGE.TREE_LOADING, this, context, filePath);       
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
            this.trigger(CHANGE.CANVAS_POINTER_CHANGED, this);       
        });

        this.on(ACTION.FOLDER_OPEN, () => {this.trigger(CHANGE.FOLDER_OPEN);});
        this.on(ACTION.FILE_IMPORT, () => {this.trigger(CHANGE.FILE_IMPORT);});
        this.on(ACTION.CANVAS_ZOOM_IN, () => {this.trigger(CHANGE.CANVAS_ZOOM_IN);});
        this.on(ACTION.CANVAS_ZOOM_OUT, () => {this.trigger(CHANGE.CANVAS_ZOOM_OUT);});

        this.on(ACTION.MODE_CHANGE, (isSizeMode) => {
            this.isSizeMode = isSizeMode;
            this.trigger(CHANGE.TREE_MODE_CHANGED, this);
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
