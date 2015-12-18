'use strict';

function ScaleGizmo ( gizmosView, nodes ) {
    var localscaleList = [], offsetList = [],
        self = this,
        center
        ;

    this._gizmosView = gizmosView;
    this._nodes = nodes;

    this._scaleTool = Editor.GizmosUtils.scaleTool( self._gizmosView.foreground, {
        start: function () {
            Editor.sendToWindows('gizmos:start-operation');
            var i;

            localscaleList = [];

            for (i = 0; i < self._nodes.length; ++i) {
                var node = self._nodes[i];
                localscaleList.push(cc.v2(node.scaleX, node.scaleY));
            }

            if (self._gizmosView.pivot === 'center') {
                center = Editor.GizmosUtils.getCenter(self._nodes);
                offsetList.length = 0;
                for (i = 0; i < self._nodes.length; ++i) {
                    offsetList.push(self._nodes[i].scenePosition.sub(center));
                }
            }
        },

        update: function (dx, dy) {
            self._nodes.forEach( node => {
                _Scene.Undo.recordObject( node.uuid );
            });

            var i, scale;

            scale = cc.v2(1.0 + dx, 1.0 - dy);

            if (self._gizmosView.pivot === 'center') {
                for (i = 0; i < localscaleList.length; ++i) {
                    self._nodes[i].scale = cc.v2(
                        localscaleList[i].x * scale.x,
                        localscaleList[i].y * scale.y
                    );

                    var offset = cc.v2(
                        offsetList[i].x * scale.x,
                        offsetList[i].y * scale.y
                    );
                    self._nodes[i].scenePosition = center.add(offset);
                }
            }
            else {
                for (i = 0; i < localscaleList.length; ++i) {
                    self._nodes[i].scale = cc.v2(
                        localscaleList[i].x * scale.x,
                        localscaleList[i].y * scale.y
                    );
                }
            }

            self._gizmosView.repaintHost();

            _Scene.recordNodeChanged(self._nodes);
        },

        end: function () {
            Editor.sendToWindows('gizmos:end-operation');
            _Scene.Undo.commit();
        },
    });
}

ScaleGizmo.prototype.update = function () {
    var activeTarget = this._nodes[0];
    var isTargetValid = activeTarget && activeTarget.isValid;

    if (!isTargetValid) {
        this._scaleTool.hide();
        return;
    }

    this._scaleTool.show();

    var scenePos, screenPos, rotation;

    if (this._gizmosView.pivot === 'center') {
        scenePos = Editor.GizmosUtils.getCenter(this._nodes);
        screenPos = this._gizmosView.sceneToPixel(scenePos);
        rotation = 0.0;
    }
    else {
        scenePos = activeTarget.scenePosition;
        screenPos = this._gizmosView.sceneToPixel(scenePos);
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
