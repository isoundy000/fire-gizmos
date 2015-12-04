'use strict';

var RectToolType = Editor.GizmosUtils.rectTool.Type;
var v2 = cc.v2;
var snapPixel = Editor.GizmosUtils.snapPixel;

function snapPixelWihVec2 (vec2) {
    vec2.x = snapPixel(vec2.x);
    vec2.y = snapPixel(vec2.y);
    return vec2;
}

function boundsToRect (bounds) {
    return cc.rect(
        bounds[1].x,
        bounds[1].y,
        bounds[3].x - bounds[1].x,
        bounds[3].y - bounds[1].y
    );
}


function RectGizmo ( gizmosView, nodes ) {
    var worldPosList = [],
        localPosList = [],
        sizeList = [],
        rectList = [],
        self = this
        ;

    var mappingH = [0,1,1];
    var mappingV = [1,0,1];

    this.xDirection = mappingH[1] > mappingH[0] ? 1 : -1;
    this.yDirection = mappingV[1] > mappingV[0] ? 1 : -1;

    this._gizmosView = gizmosView;
    this._nodes = nodes;

    this._processing = false;

    this._rect = cc.rect(0, 0, 0, 0);

    function handleAnchorPoint (delta) {
        var node = self._nodes[0];
        var size = node.getContentSize();
        var originPos = node.position;

        var pos = worldPosList[0].add(delta);
        node.worldPosition = pos;

        var parent2nodeTransform  = node.getParentToNodeTransform();
        parent2nodeTransform.tx   = parent2nodeTransform.ty = 0;

        // compute position
        var d = node.position.sub(originPos);
        d = cc.pointApplyAffineTransform(d, parent2nodeTransform);

        var anchor = v2(node.getAnchorPoint());
        anchor = anchor.add( cc.v2((d.x)/size.width, (d.y)/size.height) );
        node.setAnchorPoint(anchor);
    }

    function handleCenterRect (delta) {
        var length = self._nodes.length;
        for (var i = 0; i < length; ++i) {
            self._nodes[i].worldPosition = worldPosList[i].add(delta);
        }
    }

    function formatDelta (type, delta, sizeDelta) {
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
    }

    function formatDeltaWithAnchor(type, anchor, delta) {
        if (type === RectToolType.Right ||
            type === RectToolType.RightTop ||
            type === RectToolType.RightBottom) {
            delta.x *= anchor.x;
        }
        else {
            delta.x *= (1 - anchor.x);
        }

        if (type === RectToolType.LeftBottom ||
            type === RectToolType.Bottom ||
            type === RectToolType.RightBottom) {
            delta.y *= anchor.y;
        }
        else {
            delta.y *= (1 - anchor.y);
        }

        return delta;
    }

    function handleSizePoint (type, delta) {
        var sizeDelta = delta.clone();
        var size = sizeList[0];
        var localPosition = localPosList[0];
        var node = self._nodes[0];

        // compute transform
        var world2nodeTransform  = node.getWorldToNodeTransform();
        var node2parentTransform = node.getNodeToParentTransform();

        world2nodeTransform.tx   = world2nodeTransform.ty = 0;
        node2parentTransform.tx  = node2parentTransform.ty = 0;

        // compute position
        var d = cc.pointApplyAffineTransform(delta, world2nodeTransform);
        var anchor = node.getAnchorPoint();

        formatDeltaWithAnchor(type, anchor, d);

        // compute size
        var sd = cc.pointApplyAffineTransform(sizeDelta, world2nodeTransform);

        formatDelta(type, d, sd);

        d = cc.pointApplyAffineTransform(d, node2parentTransform);

        // apply results
        node.position = localPosition.add(d);
        node.setContentSize(cc.size(size.width + sd.x, size.height + sd.y));
    }

    function handleMutiSizePoint (type, delta) {
        var sizeDelta = delta.clone();

        formatDelta(type, delta, sizeDelta);

        var d = delta.clone();
        var anchor = v2(0,0);

        formatDeltaWithAnchor(type, anchor, d);

        var originRect = rectList.tempRect;

        var rect = originRect.clone;
        rect.x = originRect.x + d.x;
        rect.y = originRect.y + d.y;
        rect.width = originRect.width + sizeDelta.x;
        rect.height = originRect.height + sizeDelta.y;

        self._rect = rect;

        for (var i = 0, l = self._nodes.length; i < l; i++) {
            var node = self._nodes[i];
            var worldPosition = worldPosList[i];

            var xp = (worldPosition.x - originRect.x) / originRect.width;
            var yp = (worldPosition.y - originRect.y) / originRect.height;

            node.worldPosition = v2(rect.x + xp * rect.width, rect.y + yp * rect.height);

            var r = rectList[i];
            var wp = r.width / originRect.width;
            var hp = r.height / originRect.height;

            var size = sizeList[i];
            var widthDirection = size.width > 0 ? 1 : -1;
            var heightDirection = size.height > 0 ? 1 : -1;

            var sd = sizeDelta.clone();
            sd.x = sd.x * wp * widthDirection;
            sd.y = sd.y * hp * heightDirection;

            // make transform
            var world2nodeTransform = node.getWorldToNodeTransform();
            world2nodeTransform.tx = world2nodeTransform.ty = 0;
            world2nodeTransform.a = Math.abs(world2nodeTransform.a);
            world2nodeTransform.b = Math.abs(world2nodeTransform.b);
            world2nodeTransform.c = Math.abs(world2nodeTransform.c);
            world2nodeTransform.d = Math.abs(world2nodeTransform.d);

            sd = cc.pointApplyAffineTransform(sd, world2nodeTransform);
            node.setContentSize(cc.size(size.width + sd.x, size.height + sd.y));
        }
    }

    this._rectTool = Editor.GizmosUtils.rectTool( self._gizmosView.foreground, {
        start: function () {
            worldPosList.length = 0;
            sizeList.length = 0;
            localPosList.length = 0;
            rectList.length = 0;

            rectList.tempRect = boundsToRect(self.getBounds());

            self._processing = true;

            for (var i = 0, l = self._nodes.length; i < l; ++i) {
                var node = self._nodes[i];
                worldPosList.push(node.worldPosition);
                localPosList.push(node.position);
                sizeList.push(node.getContentSize());
                rectList.push(node.getWorldBounds());
            }
        },

        update: function (type, dx, dy) {
            dx *= self.xDirection;
            dy *= self.yDirection;

            var delta = new cc.Vec2(dx, dy);

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
                if (self._nodes.length > 1) {
                    handleMutiSizePoint(type, delta.clone());
                }
                else {
                    handleSizePoint(type, delta.clone());
                }
            }

            self._gizmosView.repaintHost();
        },

        end: function () {
            self._processing = false;
            self._gizmosView.undo.commit();
        },
    });
}

RectGizmo.prototype.formatBounds = function (bounds) {
    var gizmosView = this._gizmosView;
    return [
        snapPixelWihVec2( gizmosView.worldToPixel(bounds[0]) ),
        snapPixelWihVec2( gizmosView.worldToPixel(bounds[1]) ),
        snapPixelWihVec2( gizmosView.worldToPixel(bounds[2]) ),
        snapPixelWihVec2( gizmosView.worldToPixel(bounds[3]) )
    ];
};

RectGizmo.prototype.getBounds = function (flipX, flipY) {
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
        var bs = node.getWorldOrientedBounds();

        calcBounds(bs[0]);
        calcBounds(bs[1]);
        calcBounds(bs[2]);
        calcBounds(bs[3]);
    }.bind(this));

    if (flipX) {
        var temp = minX;
        minX = maxX;
        maxX = temp;
    }

    if (flipY) {
        var temp = minY;
        minY = maxY;
        maxY = temp;
    }

    // bl, tl, tr, br
    return [cc.p(minX, maxY), cc.p(minX, minY), cc.p(maxX, minY), cc.p(maxX, maxY)];
}

RectGizmo.prototype.update = function () {
    var activeTarget = this._nodes[0];
    var isTargetValid = activeTarget && activeTarget.isValid;

    if (!isTargetValid) {
        this._rectTool.hide();
        return;
    }

    this._rectTool.show();

    var length = this._nodes.length;
    var bounds = [];
    var gizmosView = this._gizmosView;

    if (length === 1) {
        var node = this._nodes[0];
        bounds = node.getWorldOrientedBounds();
        bounds = this.formatBounds(bounds);

        bounds.anchor = snapPixelWihVec2( gizmosView.worldToPixel( node.worldPosition ) );
        bounds.origin = snapPixelWihVec2( gizmosView.worldToPixel( node.parent.worldPosition ) );
        bounds.localPosition = snapPixelWihVec2( node.position );
        bounds.localSize = node.getContentSize();
    }
    else {
        var flipX = false;
        var flipY = false;

        if (this._processing) {
            flipX = this._rect.width < 0;
            flipY = this._rect.height < 0;
        }

        bounds = this.getBounds(flipX, flipY);
        bounds = this.formatBounds(bounds);
    }

    this._rectTool.setBounds(bounds);
};

RectGizmo.prototype.remove = function () {
    this._rectTool.remove();
};

module.exports = RectGizmo;
