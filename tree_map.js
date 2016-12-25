var treeMap = {
    // tree からバイナリツリーを作る
    // このバイナリツリーは各ノードにおける左右の大きさ（ファイル容量の合計）
    // がなるべくバランスするようにしてある．これによってタイルのアスペクト比
    // が小さくなる･･･ と思う
    makeBinTree: function(tree) {
        // tree 直下のファイル/ディレクトリのサイズでソート
        var keys = Object.keys(tree);
        keys.sort(function(a, b) {
            if (tree[a].size > tree[b].size) return -1;
            if (tree[a].size < tree[b].size) return 1;
            return 0;
        });
        keys = keys.filter(function(key) {
            // 空ディレクトリははずしておかないと無限ループする
            return !(tree[key].isDirectory && tree[key].size < 1);
        });

        // 再帰的にツリーを作成
        // 渡された node の中身を書き換える必要があるので注意
        function makeBinNode(node, fileNames, fileInfo) {

            // 末端
            if (fileNames.length <= 1) {
                node.size = fileInfo[fileNames[0]].size;
                node.key = fileNames[0];
                node.children = null;
                return;
            }

            var left = [];
            var right = [];
            var leftSize = 0;
            var rightSize = 0;

            // ファイルネームは大きいものから降順にソートされてる
            for (var i = 0; i < fileNames.length; i++) {
                // 左右のうち，現在小さい方に加えることでバランスさせる
                if (leftSize < rightSize) {
                    left.push(fileNames[i]);
                    leftSize += fileInfo[fileNames[i]].size;
                }
                else{
                    right.push(fileNames[i]);
                    rightSize += fileInfo[fileNames[i]].size;
                }
            }

            node.size = leftSize + rightSize;
            node.children = [{},{}];
            node.key = "";

            makeBinNode(node.children[0], left, fileInfo);
            makeBinNode(node.children[1], right, fileInfo);
        }

        var binTree = {};
        makeBinNode(binTree, keys, tree);
        return binTree;
    },

    // バイナリツリーから矩形のリストを再帰的に作成する
    // binNode: バイナリツリーのノード
    // areas: 矩形のリスト
    // rect: 分割対象の矩形．これを binNode に従い再帰的に分割
    createAreas: function(binNode, areas, rect) {

        if (!binNode.children) {
            areas.push({
                key: binNode.key,
                rect: rect
            });
            return;
        }
        
        var left = rect[0];
        var top = rect[1];
        var right = rect[2];
        var bottom = rect[3];
        var width = right - left;
        var height = bottom - top;
        var ratio = 
            1.0 * 
            binNode.children[0].size / 
            (binNode.children[0].size + binNode.children[1].size);

        // 長い辺の方を分割
        var divided = (width > height) ?
            [
                [left, top, left + width*ratio, bottom],
                [left + width*ratio, top, right, bottom],
            ] :
            [
                [left, top, right, top + height*ratio],
                [left, top + height*ratio, right, bottom],
            ];
        treeMap.createAreas(binNode.children[0], areas, divided[0]);
        treeMap.createAreas(binNode.children[1], areas, divided[1]);

    },

    //　描画領域の作成
    createTreeMap: function(fileTree, width, height) {

        var parentAreas = [];
        var binTree = treeMap.makeBinTree(fileTree);
        treeMap.createAreas(binTree, parentAreas, [0, 0, width, height]);

        var areas = [];
        for (var i = 0; i < parentAreas.length; i++) {
            if (fileTree[parentAreas[i].key].children) {
                var binTree = treeMap.makeBinTree(fileTree[parentAreas[i].key].children);
                var r = [
                    parentAreas[i].rect[0] + 10,
                    parentAreas[i].rect[1] + 40,
                    parentAreas[i].rect[2] - 10,
                    parentAreas[i].rect[3] - 10,
                ];
                treeMap.createAreas(binTree, areas, r);
            }
        }
        return parentAreas.concat(areas);

    }
};

module.exports = treeMap;
