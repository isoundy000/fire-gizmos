function MoveGizmo ( gizmosView, nodes ) {
    var scenePosList = [],
        self = this
        ;

    var mappingH = [0,1,1];
    var mappingV = [1,0,1];

    this.xDirection = mappingH[1] > mappingH[0] ? 1 : -1;
    this.yDirection = mappingV[1] > mappingV[0] ? 1 : -1;

    this._gizmosView = gizmosView;
    this._nodes = nodes;

    this._positionTool = Editor.GizmosUtils.positionTool( self._gizmosView.foreground, {
        start: function () {
            Editor.sendToWindows('gizmos:start-operation');

            scenePosList.length = 0;
            for (var i = 0; i < self._nodes.length; ++i) {
                scenePosList.push(self._nodes[i].scenePosition);
            }
        },

        update: function (dx, dy) {
            dx *= self.xDirection;
            dy *= self.yDirection;

            var delta = new cc.Vec2(dx / self._gizmosView.scale, dy / self._gizmosView.scale);

            self._nodes.forEach( node => {
                _Scene.Undo.recordObject( node.uuid );
            });

            var pos;
            var minDifference = Editor.Math.numOfDecimalsF(1.0/self._gizmosView.scale);
            for (var i = 0; i < scenePosList.length; ++i) {
                self._nodes[i].scenePosition = scenePosList[i].add(delta);

                pos = self._nodes[i].position;
                _Scene.adjustNodePosition(self._nodes[i], minDifference);
            }

            self._gizmosView.repaintHost();

            _Scene.AnimUtils.recordNodeChanged(self._nodes);
        },

        end: function () {
            Editor.sendToWindows('gizmos:end-operation');
            _Scene.Undo.commit();
        },
    });
}

MoveGizmo.prototype.update = function () {
    var activeTarget = this._nodes[0];
    var isTargetValid = activeTarget && activeTarget.isValid;

    if (!isTargetValid) {
        this._positionTool.hide();
        return;
    }

    this._positionTool.show();

    var scenePos, screenPos, rotation;

    if (this._gizmosView.pivot === 'center') {
        scenePos = Editor.GizmosUtils.getCenter(this._nodes);
        screenPos = this._gizmosView.sceneToPixel(scenePos);
        rotation = 0.0;
    }
    else {
        scenePos = activeTarget.scenePosition;
        screenPos = this._gizmosView.sceneToPixel(scenePos);
        rotation = 0.0;

        if ( this.coordinate !== 'global' ) {
            rotation = activeTarget.sceneRotation;
        }
    }

    screenPos.x = Editor.GizmosUtils.snapPixel(screenPos.x);
    screenPos.y = Editor.GizmosUtils.snapPixel(screenPos.y);

    this._positionTool.position = screenPos;
    this._positionTool.rotation = rotation;

    this._positionTool
        .translate(this._positionTool.position.x, this._positionTool.position.y)
        .rotate(this._positionTool.rotation, 0.0, 0.0)
        ;
};

MoveGizmo.prototype.remove = function () {
    if (this._positionTool) {
        this._positionTool.remove();
        this._positionTool = null;
    }
};

module.exports = MoveGizmo;
