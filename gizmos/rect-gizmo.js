var RectToolType = Editor.GizmosUtils.rectTool.Type;

function RectGizmo ( gizmosView, nodes ) {
    var scenePosList = [],
        sizeList = [],
        self = this
        ;

    var mappingH = [0,1,1];
    var mappingV = [1,0,1];

    this.xDirection = mappingH[1] > mappingH[0] ? 1 : -1;
    this.yDirection = mappingV[1] > mappingV[0] ? 1 : -1;

    this._gizmosView = gizmosView;
    this._nodes = nodes;

    function handleAnchorPoint (delta) {
        var node = self._nodes[0];
        var size = node.size;
        var originPos = node.position;

        delta.x *= size.x > 0 ? -1 : 1;
        delta.y *= size.y > 0 ? -1 : 1;

        node.scenePosition = scenePosList[0].sub(delta);
        node.anchorPoint = node.anchorPoint.add( cc.v2((node.x - originPos.x)/size.x, (node.y - originPos.y)/size.y) );
    }

    function handleCenterRect (delta) {
        for (var i = 0; i < self._nodes.length; ++i) {
            self._nodes[i].scenePosition = scenePosList[i].add(delta);
        }
    }

    function handleSizePoint (type, delta) {
        var sizeDelta = delta.clone();

        if (type === RectToolType.LeftBottom) {
            sizeDelta.x *= -1;
        }
        else if (type === RectToolType.LeftTop) {
            sizeDelta.x *= -1;
            sizeDelta.y *= -1;
        }
        else if (type === RectToolType.RightTop) {
            sizeDelta.y *= -1;
        }
        else if (type === RectToolType.Left) {
            sizeDelta.x *= -1;
            delta.y = sizeDelta.y = 0;
        }
        else if (type === RectToolType.Right) {
            delta.y = sizeDelta.y = 0;
        }
        else if (type === RectToolType.Top) {
            sizeDelta.y *= -1;
            delta.x = sizeDelta.x = 0;
        }
        else if (type === RectToolType.Bottom) {
            delta.x = sizeDelta.x = 0;
        }

        for (var i = 0; i < self._nodes.length; ++i) {
            var node = self._nodes[i];

            //
            var widthDirection = sizeList[i].x > 0 ? 1 : -1;
            var heightDirection = sizeList[i].y > 0 ? 1 : -1;

            var sdx = sizeDelta.x * widthDirection;
            var sdy = sizeDelta.y * heightDirection;

            var d = delta.clone();

            if (type === RectToolType.Right ||
                type === RectToolType.RightTop ||
                type === RectToolType.RightBottom) {
                d.x *= widthDirection === -1 ? (1 - node.anchorPoint.x) : node.anchorPoint.x;
            }
            else {
                d.x *= widthDirection === -1 ? node.anchorPoint.x : (1 - node.anchorPoint.x);
            }

            if (type === RectToolType.LeftBottom ||
                type === RectToolType.Bottom ||
                type === RectToolType.RightBottom) {
                d.y *= heightDirection === -1 ? (1 - node.anchorPoint.y) : node.anchorPoint.y;
            }
            else {
                d.y *= heightDirection === -1 ? node.anchorPoint.y : (1 - node.anchorPoint.y);
            }

            self._nodes[i].size = sizeList[0].add(cc.v2(sdx, sdy));
            self._nodes[i].scenePosition = scenePosList[i].add(d);
        }
    }

    this._rectTool = Editor.GizmosUtils.rectTool( self._gizmosView.foreground, {
        start: function (type) {
            scenePosList.length = 0;
            sizeList.length = 0;

            for (var i = 0; i < self._nodes.length; ++i) {
                scenePosList.push(self._nodes[i].scenePosition);
                sizeList.push(self._nodes[i].size);
            }
        },

        update: function (type, dx, dy) {
            dx *= self.xDirection;
            dy *= self.yDirection;

            var delta = new cc.Vec2(dx / self._gizmosView.scale, dy / self._gizmosView.scale);

            if (type === RectToolType.Anchor) {
                handleAnchorPoint(delta.clone());
            }
            else if (type === RectToolType.Center) {
                handleCenterRect(delta.clone());
            }
            else {
                handleSizePoint(type, delta.clone());
            }

            self._gizmosView.repaintHost();
        }
    });
}


RectGizmo.prototype.update = function () {
    if ( this._nodes.length === 0 ) {
        this._rectTool.hide();
        return;
    }

    this._rectTool.show();

    var minX = Number.MAX_VALUE,
        maxX = -Number.MAX_VALUE,
        minY = Number.MAX_VALUE,
        maxY = -Number.MAX_VALUE;

    function calcBounds (p) {
        if (p.x > maxX) maxX = p.x;
        if (p.x < minX) minX = p.x;

        if (p.y > maxY) maxY = p.y;
        if (p.y < minY) minY = p.y;
    }

    this._nodes.forEach(function (node) {
        var bounds = node.getWorldOrientedBounds();

        calcBounds(this._gizmosView.worldToPixel(bounds[0]));
        calcBounds(this._gizmosView.worldToPixel(bounds[1]));
        calcBounds(this._gizmosView.worldToPixel(bounds[2]));
        calcBounds(this._gizmosView.worldToPixel(bounds[3]));
    }.bind(this));

    bounds = [cc.p(minX, minY), cc.p(minX, maxY), cc.p(maxX, maxY), cc.p(maxX, minY)];
    if (this._nodes.length === 1) {
        var node = this._nodes[0];
        var anchor = node.anchorPoint;

        bounds.anchor = cc.v2(minX + (maxX - minX) * anchor.x, maxY - (maxY - minY) * anchor.y);
        bounds.origin = this._gizmosView.worldToPixel(node.parent.worldPosition);
        bounds.localPosition = node.position;
        bounds.localSize = node.size;
    }

    this._rectTool.setBounds(bounds);
};

RectGizmo.prototype.remove = function () {
    this._rectTool.remove();
};

module.exports = RectGizmo;
