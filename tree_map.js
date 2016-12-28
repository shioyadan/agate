function TreeMap(){

    let self = {

        // 初期化
        init: function() {

        },

        // バイナリツリーから矩形のリストを再帰的に作成する
        // binNode: バイナリツリーのノード
        // areas: 矩形のハッシュ
        // rect: 分割対象の矩形．これを binNode に従い再帰的に分割
        createAbstractAreas: function(binNode, areas, rect) {

            if (!binNode.children) {
                areas[binNode.key] = rect;
                return;
            }
            
            let left = rect[0];
            let top = rect[1];
            let right = rect[2];
            let bottom = rect[3];
            let width = right - left;
            let height = bottom - top;
            let ratio = 
                1.0 * 
                binNode.children[0].size / 
                (binNode.children[0].size + binNode.children[1].size);

            // 長い辺の方を分割
            let divided = 
                (width * 1.02 > height) ?
                [
                    [left, top, left + width*ratio, bottom],
                    [left + width*ratio, top, right, bottom],
                ] :
                [
                    [left, top, right, top + height*ratio],
                    [left, top + height*ratio, right, bottom],
                ];
            self.createAbstractAreas(binNode.children[0], areas, divided[0]);
            self.createAbstractAreas(binNode.children[1], areas, divided[1]);

        },


        // キャッシュされたバイナリツリーを得る
        getCachedDivTree: function(fileTree) {

            // 上位から2階層分のキャッシュを作っていくので，ここにくるのは最上位の時のみ
            if (!fileTree.treeMapCache) {
                fileTree.treeMapCache = {
                    areas: null,
                    rect: [0, 0, 1.6, 0.9]
                };
            }

            if (!fileTree.treeMapCache.areas) {
                let divTree = self.makeBinTree(fileTree.children);
                let areas = {};
                self.createAbstractAreas(divTree, areas, fileTree.treeMapCache.rect);

                fileTree.treeMapCache.areas = areas;
                for (let key in areas) {
                    let r = areas[key];
                    fileTree.children[key].treeMapCache = {
                        rect: [0, 0, r[2] - r[0], r[3] - r[1]],
                        areas: null
                    };

                    // 正規化
                    areas[key][0] /= fileTree.treeMapCache.rect[2] - fileTree.treeMapCache.rect[0];
                    areas[key][1] /= fileTree.treeMapCache.rect[3] - fileTree.treeMapCache.rect[1];
                    areas[key][2] /= fileTree.treeMapCache.rect[2] - fileTree.treeMapCache.rect[0];
                    areas[key][3] /= fileTree.treeMapCache.rect[3] - fileTree.treeMapCache.rect[1];
                }
            }
            return fileTree.treeMapCache;
        },

        // tree からバイナリツリーを作る
        // このバイナリツリーはあるフォルダの中のファイルの分割方法を表す．
        // このバイナリツリーは各ノードにおける左右の大きさ（ファイル容量の合計）
        // がなるべくバランスするようにしてある．これによってタイルのアスペクト比
        // が小さくなる･･･ と思う
        makeBinTree: function(tree) {
            // tree 直下のファイル/ディレクトリのサイズでソート
            let keys = Object.keys(tree);

            keys = keys.filter(function(key) {
                // 空ディレクトリ or 容量0のファイルははずしておかないと無限ループする
                return !(tree[key].size < 1);
            });

            keys.sort(function(a, b) {
                let sizeA = tree[a].size;
                let sizeB = tree[b].size;
                if (sizeA > sizeB) return -1;
                if (sizeA < sizeB) return 1;
                return 0;
            });

            // 再帰的にツリーを作成
            // 渡された node の中身を書き換える必要があるので注意
            function makeBinNode(node, fileNames, fileInfo) {

                // 末端
                if (fileNames.length <= 1) {
                    node.size = fileInfo[fileNames[0]].size;
                    node.key = fileNames[0];
                    node.children = null;
                    node.fileInfoChildren = fileInfo[fileNames[0]];
                    return;
                }

                let left = [];
                let right = [];
                let leftSize = 0;
                let rightSize = 0;

                // ファイルネームは大きいものから降順にソートされてる
                for (let fileName of fileNames) {
                    // 左右のうち，現在小さい方に加えることでバランスさせる
                    if (leftSize < rightSize) {
                        left.push(fileName);
                        leftSize += fileInfo[fileName].size;
                    }
                    else{
                        right.push(fileName);
                        rightSize += fileInfo[fileName].size;
                    }
                }

                node.size = leftSize + rightSize;
                node.children = [{},{}];
                node.key = "";
                node.fileInfoChildren = null;

                makeBinNode(node.children[0], left, fileInfo);
                makeBinNode(node.children[1], right, fileInfo);
            }

            let binTree = {};
            makeBinNode(binTree, keys, tree);
            return binTree;
        },

        // バイナリツリーから矩形のリストを再帰的に作成する
        // binNode: バイナリツリーのノード
        // areas: 矩形のリスト
        // rect: 分割対象の矩形．これを binNode に従い再帰的に分割
        createAreas: function(binNode, areas, rect, level) {

            if (!binNode.children) {
                areas.push({
                    key: binNode.key,
                    fileInfoChildren: binNode.fileInfoChildren,
                    rect: rect,
                    level: level
                });
                return;
            }
            
            let left = rect[0];
            let top = rect[1];
            let right = rect[2];
            let bottom = rect[3];
            let width = right - left;
            let height = bottom - top;
            let ratio = 
                1.0 * 
                binNode.children[0].size / 
                (binNode.children[0].size + binNode.children[1].size);

            // 長い辺の方を分割
            let divided = 
                (width > height) ?
                [
                    [left, top, left + width*ratio, bottom],
                    [left + width*ratio, top, right, bottom],
                ] :
                [
                    [left, top, right, top + height*ratio],
                    [left, top + height*ratio, right, bottom],
                ];
            self.createAreas(binNode.children[0], areas, divided[0], level);
            self.createAreas(binNode.children[1], areas, divided[1], level);

        },

        // 描画領域の作成
        createTreeMap: function(fileTree, width, height, clipRect) {

            let wholeAreas = [];

            let parentAreas = [];

            let cache = self.getCachedDivTree(fileTree);
            for (let key in cache.areas) {
                let r = cache.areas[key];
                parentAreas.push({
                    key: key,
                    fileInfoChildren: fileTree.children[key],
                    rect: [r[0]*width, r[1]*height, r[2]*width, r[3]*height],
                    level: 0
                });
            }

            wholeAreas = wholeAreas.concat(parentAreas);


            for (let j = 1; j < 100; j++) {
                let areas = [];
                for (let a of parentAreas) {
                    if (a.fileInfoChildren.children) {
                        let r = [
                            a.rect[0] + 10,
                            a.rect[1] + 30,
                            a.rect[2] - 10,
                            a.rect[3] - 10,
                        ];

                        // 範囲外なら，これ以上は探索しない
                        if (r[0] > clipRect[2] || r[2] < clipRect[0] || 
                            r[1] > clipRect[3] || r[3] < clipRect[1]) {
                            continue;
                        }

                        // 一定以上の大きさなら探索
                        if (r[2] - r[0] > 40 && r[3] - r[1] > 40){

                            let width = r[2] - r[0];
                            let height = r[3] - r[1];
                            let cache = self.getCachedDivTree(a.fileInfoChildren);
                            for (let key in cache.areas) {
                                let cr = cache.areas[key];

                                areas.push({
                                    key: key,
                                    fileInfoChildren: a.fileInfoChildren.children[key],
                                    rect: [r[0]+cr[0]*width, r[1]+cr[1]*height, r[0]+cr[2]*width, r[1]+cr[3]*height],
                                    level: j
                                });
                            }
                        }
                    }
                }

                // 新規追加エリアがないので抜ける
                if (areas.length == 0) {
                    break;
                }
                wholeAreas = wholeAreas.concat(areas);
                parentAreas = areas;
            }

            return wholeAreas;

        }
    };

    // 初期化
    self.init();
    return self;

}


module.exports = TreeMap;
