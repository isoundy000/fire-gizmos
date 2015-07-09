function MoveGizmo ( gizmos, nodes ) {
    var scenePosList = [],
        self = this
        ;

    this._gizmos = gizmos;
    this._nodes = nodes;

    this._positionTool = Editor.GizmosUtils.positionTool( gizmos.scene, {
        start: function () {
            scenePosList.length = 0;
            for (var i = 0; i < nodes.length; ++i) {
                scenePosList.push(nodes[i].scenePosition);
            }
        },

        update: function (dx, dy) {
            var delta = new Fire.Vec2(dx / gizmos.scale, -dy / gizmos.scale);

            for (var i = 0; i < scenePosList.length; ++i) {
                nodes[i].scenePosition = scenePosList[i].add(delta);
            }

            self.repaint();
        }
    });
    this.repaint();
}

MoveGizmo.prototype.repaint = function () {
    var activeTarget = this._nodes[0];
    var scenePos, screenPos, rotation;

    if (this._gizmos.pivot === 'center') {
        scenePos = Editor.GizmosUtils.getCenter(this._nodes);
        screenPos = this._gizmos.sceneToPixel(scenePos.x, scenePos.y);
        rotation = 0.0;
    }
    else {
        scenePos = activeTarget.scenePosition;
        screenPos = this._gizmos.sceneToPixel(scenePos.x, scenePos.y);
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
