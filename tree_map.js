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

        function makeBinNode(node, fileNames, fileInfo) {

            // 渡された node の中身を書き換える必要があるので注意
            node.left = [];
            node.right = [];
            node.leftNode = {};
            node.rightNode = {};
            node.leftSize = 0;
            node.rightSize = 0;

            // ファイルネームは大きいものから降順にソートされてる
            for (var i = 0; i < fileNames.length; i++) {
                // 左右のうち，現在小さい方に加えることでバランスさせる
                if (node.leftSize < node.rightSize) {
                    node.left.push(fileNames[i]);
                    node.leftSize += fileInfo[fileNames[i]].size;
                }
                else{
                    node.right.push(fileNames[i]);
                    node.rightSize += fileInfo[fileNames[i]].size;
                }
            }
            if (node.left.length > 1) {
                makeBinNode(node.leftNode, node.left, fileInfo);
            }
            if (node.right.length > 1) {
                makeBinNode(node.rightNode, node.right, fileInfo);
            }
        }

        var binTree = {};
        makeBinNode(binTree, keys, tree);
        return binTree;
    },

    //　描画
    createTreeMap: function(fileTree, width, height) {

        function calcArea(binTree, areas, rect) {
            var left = rect[0];
            var top = rect[1];
            var right = rect[2];
            var bottom = rect[3];
            var width = right - left;
            var height = bottom - top;
            var ratio = 1.0 * binTree.leftSize / (binTree.leftSize + binTree.rightSize);

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
                

            if (binTree.left.length == 1) {
                areas.push({
                    key: binTree.left[0],
                    rect: divided[0]
                });
            }
            else{
                calcArea(binTree.leftNode, areas, divided[0]);
            }

            if (binTree.right.length == 1) {
                areas.push({
                    key: binTree.right[0],
                    rect: divided[1]
                });
            }
            else{
                calcArea(binTree.rightNode, areas, divided[1]);
            }

        }
        var rectTree = treeMap.makeBinTree(fileTree);
        var areas = [];
        calcArea(rectTree, areas, [0, 0, width, height]);
        return areas;
    }
};

module.exports = treeMap;
