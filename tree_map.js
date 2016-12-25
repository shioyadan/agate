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

    //　描画
    createTreeMap: function(fileTree, width, height) {

        function calcArea(binTree, areas, rect) {

            if (!binTree.children) {
                areas.push({
                    key: binTree.key,
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
                binTree.children[0].size / 
                (binTree.children[0].size + binTree.children[1].size);

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
            calcArea(binTree.children[0], areas, divided[0]);
            calcArea(binTree.children[1], areas, divided[1]);

        }
        var binTree = treeMap.makeBinTree(fileTree);
        var areas = [];
        calcArea(binTree, areas, [0, 0, width, height]);
        return areas;
    }
};

module.exports = treeMap;
