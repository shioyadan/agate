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

        function calcArea(rectTree, areas, left, top, right, bottom, horizontal) {
            var width = right - left;
            var height = bottom - top;
            if (horizontal) {
                var leftWidth = width * rectTree.leftSize / (rectTree.leftSize + rectTree.rightSize);
                var rightWidth = width * rectTree.rightSize / (rectTree.leftSize + rectTree.rightSize);

                if (rectTree.left.length == 1) {
                    areas.push({
                        key: rectTree.left[0],
                        pos: [left, top, left + leftWidth, bottom]
                    });
                }
                else{
                    calcArea(
                        rectTree.leftNode, areas, left, top, left + leftWidth, bottom, leftWidth > height);
                }

                if (rectTree.right.length == 1) {
                    areas.push({
                        key: rectTree.right[0],
                        pos: [left + leftWidth, top, right, bottom]
                    });
                }
                else{
                    calcArea(rectTree.rightNode, areas, left + leftWidth, top, right, bottom, rightWidth > height);
                }
            }
            else {
                var firstHeight = height * rectTree.leftSize / (rectTree.leftSize + rectTree.rightSize);
                var secondHeight = height * rectTree.rightSize / (rectTree.leftSize + rectTree.rightSize);

                if (rectTree.left.length == 1) {
                    areas.push({
                        key: rectTree.left[0],
                        pos: [left, top, right, top + firstHeight]
                    });
                }
                else{
                    calcArea(rectTree.leftNode, areas, left, top, right, top + firstHeight, width > firstHeight);
                }

                if (rectTree.right.length == 1) {
                    areas.push({
                        key: rectTree.right[0],
                        pos: [left, top + firstHeight, right, bottom]
                    });
                }
                else{
                    calcArea(rectTree.rightNode, areas, left, top + firstHeight, right, bottom, width > secondHeight);
                }

            }
        }
        var rectTree = treeMap.makeBinTree(fileTree);
        var areas = [];
        calcArea(rectTree, areas, 0, 0, width, height, width > height);
        return areas;
    }
};

module.exports = treeMap;
