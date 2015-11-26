var RectToolType = Editor.GizmosUtils.rectTool.Type;
var v2 = cc.v2;
var snapPixel = Editor.GizmosUtils.snapPixel;

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
        var size = node.getContentSize();
        var originPos = node.position;

        delta.x *= size.width > 0 ? -1 : 1;
        delta.y *= size.height > 0 ? -1 : 1;

        node.scenePosition = scenePosList[0].sub(delta);

        var anchor = v2(node.getAnchorPoint());
        anchor = anchor.add( cc.v2((node.x - originPos.x)/size.width, (node.y - originPos.y)/size.height) );
        node.setAnchorPoint(anchor);
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
            var widthDirection = sizeList[i].width > 0 ? 1 : -1;
            var heightDirection = sizeList[i].height > 0 ? 1 : -1;

            var sdx = sizeDelta.x * widthDirection;
            var sdy = sizeDelta.y * heightDirection;

            var d = delta.clone();
            var anchor = v2(node.getAnchorPoint());

            if (type === RectToolType.Right ||
                type === RectToolType.RightTop ||
                type === RectToolType.RightBottom) {
                d.x *= widthDirection === -1 ? (1 - anchor.x) : anchor.x;
            }
            else {
                d.x *= widthDirection === -1 ? anchor.x : (1 - anchor.x);
            }

            if (type === RectToolType.LeftBottom ||
                type === RectToolType.Bottom ||
                type === RectToolType.RightBottom) {
                d.y *= heightDirection === -1 ? (1 - anchor.y) : anchor.y;
            }
            else {
                d.y *= heightDirection === -1 ? anchor.y : (1 - anchor.y);
            }

            var size = sizeList[0];
            self._nodes[i].setContentSize(cc.size(size.width + sdx, size.height + sdy));
            self._nodes[i].scenePosition = scenePosList[i].add(d);
        }
    }

    this._rectTool = Editor.GizmosUtils.rectTool( self._gizmosView.foreground, {
        start: function (type) {
            scenePosList.length = 0;
            sizeList.length = 0;

            for (var i = 0; i < self._nodes.length; ++i) {
                var node = self._nodes[i];
                scenePosList.push(node.scenePosition);
                sizeList.push(node.getContentSize());
            }
        },

        update: function (type, dx, dy) {
            dx *= self.xDirection;
            dy *= self.yDirection;

            var delta = new cc.Vec2(dx / self._gizmosView.scale, dy / self._gizmosView.scale);

            self._nodes.forEach( node => {
                self._gizmosView.undo.recordObject( node.uuid );
            });

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
        },

        end: function () {
            self._gizmosView.undo.commit();
        },
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

    minX = snapPixel(minX);
    minY = snapPixel(minY);
    maxX = snapPixel(maxX);
    maxY = snapPixel(maxY);

    bounds = [cc.p(minX, minY), cc.p(minX, maxY), cc.p(maxX, maxY), cc.p(maxX, minY)];

    if (this._nodes.length === 1) {
        var node = this._nodes[0];
        var anchor = node.getAnchorPoint();

        bounds.anchor = cc.v2(minX + (maxX - minX) * anchor.x, maxY - (maxY - minY) * anchor.y);
        bounds.origin = this._gizmosView.worldToPixel(node.parent.worldPosition);
        bounds.localPosition = node.position;
        bounds.localSize = node.getContentSize();

        function snapPixelWihVec2 (vec2) {
            vec2.x = snapPixel(vec2.x);
            vec2.y = snapPixel(vec2.y);
        }

        snapPixelWihVec2(bounds.anchor);
        snapPixelWihVec2(bounds.origin);
        snapPixelWihVec2(bounds.localPosition);
    }

    this._rectTool.setBounds(bounds);
};

RectGizmo.prototype.remove = function () {
    this._rectTool.remove();
};

module.exports = RectGizmo;
