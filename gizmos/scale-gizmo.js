function ScaleGizmo ( gizmos, nodes ) {
    var localscaleList = [], offsetList = [],
        self = this,
        center
        ;

    this._gizmos = gizmos;
    this._nodes = nodes;

    this._scaleTool = Editor.GizmosUtils.scaleTool( gizmos.scene, {
        start: function () {
            var i;

            localscaleList = [];

            for (i = 0; i < nodes.length; ++i) {
                localscaleList.push(nodes[i].scale);
            }

            if (self._gizmos.pivot === 'center') {
                center = Editor.GizmosUtils.getCenter(nodes);
                offsetList.length = 0;
                for (i = 0; i < nodes.length; ++i) {
                    offsetList.push(nodes[i].scenePosition.sub(center));
                }
            }
        },

        update: function (dx, dy) {
            var i, scale;

            scale = Fire.v2(1.0 + dx, 1.0 - dy);

            if (self._gizmos.pivot === 'center') {
                for (i = 0; i < localscaleList.length; ++i) {
                    nodes[i].scale = Fire.v2(
                        localscaleList[i].x * scale.x,
                        localscaleList[i].y * scale.y
                    );

                    var offset = Fire.v2(
                        offsetList[i].x * scale.x,
                        offsetList[i].y * scale.y
                    );
                    nodes[i].scenePosition = center.add(offset);
                }
            }
            else {
                for (i = 0; i < localscaleList.length; ++i) {
                    nodes[i].scale = Fire.v2(
                        localscaleList[i].x * scale.x,
                        localscaleList[i].y * scale.y
                    );
                }
            }

            self.repaint();
        }
    });
    this.repaint();
}

ScaleGizmo.prototype.repaint = function () {
    var activeTarget = this._nodes[0];
    var worldpos, screenpos, rotation;

    if (this._gizmos.pivot === 'center') {
        scenePos = Editor.GizmosUtils.getCenter(this._nodes);
        screenPos = this._gizmos.sceneToPixel(scenePos.x, scenePos.y);
        rotation = 0.0;
    }
    else {
        scenePos = activeTarget.scenePosition;
        screenPos = this._gizmos.sceneToPixel(scenePos.x, scenePos.y);
        rotation = activeTarget.sceneRotation;
    }

    screenPos.x = Editor.GizmosUtils.snapPixel(screenPos.x);
    screenPos.y = Editor.GizmosUtils.snapPixel(screenPos.y);

    this._scaleTool.position = screenPos;
    this._scaleTool.rotation = rotation;

    this._scaleTool
        .translate(this._scaleTool.position.x, this._scaleTool.position.y)
        .rotate(this._scaleTool.rotation, 0.0, 0.0)
        ;
};

ScaleGizmo.prototype.remove = function () {
    this._scaleTool.remove();
};

module.exports = ScaleGizmo;
