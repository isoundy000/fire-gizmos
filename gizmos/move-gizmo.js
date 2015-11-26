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
                self._gizmosView.undo.recordObject( node.uuid );
            });

            for (var i = 0; i < scenePosList.length; ++i) {
                self._nodes[i].scenePosition = scenePosList[i].add(delta);
            }

            self._gizmosView.repaintHost();
        },

        end: function () {
            self._gizmosView.undo.commit();
        },
    });
}

MoveGizmo.prototype.update = function () {
    if ( this._nodes.length === 0 ) {
        this._positionTool.hide();
        return;
    }

    this._positionTool.show();

    var activeTarget = this._nodes[0];
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
    this._positionTool.remove();
};

module.exports = MoveGizmo;
