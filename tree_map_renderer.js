function TreeMapRenderer(){
    let self = this;

    // タイル内の文字のフォントサイズ
    self.FONT_SIZE = 15;

    // 各タイルの中の子タイルへのマージン
    // rect の各方向に足される
    self.TILE_MERGIN = [8, 8 + this.FONT_SIZE, -8, -8];

    /*global TreeMap*/ 
    self.treeMap = new TreeMap();
}

TreeMapRenderer.prototype.render = function(
    canvas, tree, virtualWidth, virtualHeight, viewPort
){
    let self = this;

    let width = canvas.width;
    let height = canvas.height;

    if (!tree) {
        let c = canvas.getContext("2d");
        c.fillStyle = "rgb(200,200,200)";
        c.fillRect(0, 0, width, height);
        return;
    }

    let areas = self.treeMap.createTreeMap(
        tree, 
        virtualWidth, 
        virtualHeight, 
        viewPort,
        self.TILE_MERGIN
    );

    let fillStyle = [];
    //let fillFileStyle = "hsl(" + 0 + ", 70%, 70%)";
    let strokeStyle = [];
    for (let i = 0; i < 10; i++) {
        fillStyle.push("hsl(" + ((0+i*30)%360) + ", 40%, 70%)");
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

    function sizeToStr(size) {
        if (size > 1024*1024) {
            return "" + Math.ceil(size/1024/1024) + " MB";
        }
        else if (size > 1024) {
            return "" + Math.ceil(size/1024) + " KB";
        }
        else {
            return "" + size + " B";
        }
    }

    // 文字領域が確保できた場合は描画
    let strAreas = areas.filter(function(a){
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
        let pos = [Math.max(0, rect[0]) + self.TILE_MERGIN[0]/2, rect[1] + self.FONT_SIZE];

        if (!a.fileNode.children) {
            // ファイル
            pos[0] += 10;
            pos[1] += (rect[3] - rect[1] - self.FONT_SIZE*3) / 2;
        }
        c.strokeText(a.key, pos[0], pos[1]);

        if (!a.fileNode.children) {
            c.strokeText(sizeToStr(a.fileNode.size), pos[0], pos[1] + self.FONT_SIZE*1.2);
        }
    }

    // 次に白を重ねて書く
    c.fillStyle = "rgb(255,255,255)";
    for (let a of strAreas) {
        let rect = a.rect;
        let pos = [Math.max(0, rect[0]) + self.TILE_MERGIN[0]/2, rect[1] + self.FONT_SIZE];
        if (!a.fileNode.children) {
            // ファイル
            pos[0] += 10;
            pos[1] += (rect[3] - rect[1] - self.FONT_SIZE*3) / 2;
        }

        c.fillText(a.key, pos[0], pos[1]);

        if (!a.fileNode.children) {
            c.fillText(sizeToStr(a.fileNode.size), pos[0], pos[1] + self.FONT_SIZE*1.2);
        }
    }
};


module.exports = TreeMapRenderer;
