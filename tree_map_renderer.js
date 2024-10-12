const {TreeMap} = require("./tree_map.js");
const {FileNode} = require("./file_info.js");

class TreeMapRenderer {
    constructor() {

        // タイル内の文字のフォントサイズ
        this.FONT_SIZE = 15;
    
        // 各タイルの中の子タイルへのマージン
        // rect の各方向に足される
        this.TILE_MARGIN = [8, 8 + this.FONT_SIZE, -8, -8];

        this.pointedFileNode = null;
        this.treeMap_ = new TreeMap();
    }

    clear() {
        this.treeMap_.clear();
    }

    getFileNodeFromPoint(pos) {
        return this.treeMap_.getFileNodeFromPoint(pos);
    };

    getPathFromFileNode(fileNode) {
        return this.treeMap_.getPathFromFileNode(fileNode);
    };

    // canvas に対し，tree のファイルツリーを
    // virtualWidth/virtualHeight に対応した大きさの tree map を生成し，
    // そこの上の viewPort を描画する．
    /**
     * @param {*} canvas 
     * @param {FileNode} tree 
     * @param {number} virtualWidth 
     * @param {number} virtualHeight 
     * @param {*} viewPort 
     * @param {boolean} isSizeMode
     */
    render(canvas, tree, virtualWidth, virtualHeight, viewPort, isSizeMode) {
        let self = this;

        let width = canvas.width;
        let height = canvas.height;

        if (!tree) {
            let c = canvas.getContext("2d");
            c.fillStyle = "rgb(200,200,200)";
            c.fillRect(0, 0, width, height);
            return;
        }

        let areas = self.treeMap_.createTreeMap(
            tree, 
            virtualWidth, 
            virtualHeight, 
            viewPort,
            self.TILE_MARGIN,
            isSizeMode
        );

        let fillStyle = [];
        //let fillFileStyle = "hsl(" + 0 + ", 70%, 70%)";
        let strokeStyle = [];
        for (let i = 0; i < 20; i++) {
            fillStyle.push("hsl(" + ((0+i*30)%360) + ", 50%, 80%)");
            strokeStyle.push("hsl(" + ((0+i*30)%360) + ", 20%, 40%)");
        }

        let c = canvas.getContext("2d");

        c.fillStyle = "rgb(200,200,200)";
        c.fillRect(0, 0, width, height);


        let prevLevel = -1;
        for (let a of areas) {
            let rect = a.rect;
            // レベルに応じた色にする
            if (prevLevel != a.level) {
                c.fillStyle = fillStyle[a.level];
                prevLevel = a.level;
            }
            c.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
        }

        prevLevel = -1;
        for (let a of areas) {
            let rect = a.rect;
            if (prevLevel != a.level) {
                // 枠線の太さもレベルに応じる
                //c.lineWidth = Math.max(2 - a.level/2, 0.5); 
                c.lineWidth = 1; 
                // 枠線の色は，基準色から明度をおとしたものに
                c.strokeStyle = strokeStyle[a.level];
                prevLevel = a.level;
            }
            if (!a.fileNode.children) {
                c.lineWidth = 2; 
                prevLevel = -1;
            }
            c.strokeRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
        }

        // ポインタが指しているファイルをハイライト
        // ループが異なるのは描画を上書きされないようにするため
        c.lineWidth = 5; 
        for (let a of areas) {
            if (a.fileNode == this.pointedFileNode) {
                // c.strokeStyle = "rgb(230,230,250)";
                c.strokeStyle = strokeStyle[a.level];
                let rect = a.rect;
                c.strokeRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
                break;
            }
        }


        function fileNodeToStr(fileNode) {
            let str = "";
            let num = isSizeMode ? fileNode.size : fileNode.fileCount;
            if (num > 1024*1024*1024) {
                str = "" + Math.ceil(num/1024/1024/1024) + "G";
            }
            else if (num > 1024*1024) {
                str = "" + Math.ceil(num/1024/1024) + "M";
            }
            else if (num > 1024) {
                str = "" + Math.ceil(num/1024) + "K";
            }
            else {
                str = "" + num;
            }
            str += isSizeMode ? "B" : " files";
            if (num == 1) {
                str = "";
            }
            return str;
        }

        // 文字領域が確保できた場合は描画
        let strAreas = areas.filter((a) => {
            let rect = a.rect;
            return (rect[2] - rect[0] > 80 && rect[3] - rect[1] > 40);
        });

        // 1回太めに文字の枠線を書く
        c.font = "bold " + self.FONT_SIZE + "px Century Gothic";
        c.lineWidth = 4; 
        prevLevel = -1;

        for (let a of strAreas) {
            let rect = a.rect;
            if (prevLevel != a.level) {
                c.strokeStyle = strokeStyle[a.level];
                prevLevel = a.level;
            }
            let pos = [Math.max(0, rect[0]) + self.TILE_MARGIN[0]/2, rect[1] + self.FONT_SIZE];

            if (!a.fileNode.children) {
                // ファイル
                pos[0] += 10;
                pos[1] += (rect[3] - rect[1] - self.FONT_SIZE*3) / 2;
            }
            c.strokeText(a.key, pos[0], pos[1]);

            if (!a.fileNode.children) {
                c.strokeText(fileNodeToStr(a.fileNode), pos[0], pos[1] + self.FONT_SIZE*1.2);
            }
        }

        // 次に白を重ねて書く
        c.fillStyle = "rgb(255,255,255)";
        for (let a of strAreas) {
            let rect = a.rect;
            let pos = [Math.max(0, rect[0]) + self.TILE_MARGIN[0]/2, rect[1] + self.FONT_SIZE];
            if (!a.fileNode.children) {
                // ファイル
                pos[0] += 10;
                pos[1] += (rect[3] - rect[1] - self.FONT_SIZE*3) / 2;
            }

            c.fillText(a.key, pos[0], pos[1]);

            if (!a.fileNode.children) {
                c.fillText(fileNodeToStr(a.fileNode), pos[0], pos[1] + self.FONT_SIZE*1.2);
            }
        }
    }
}


module.exports.TreeMapRenderer = TreeMapRenderer;
