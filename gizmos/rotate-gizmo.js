function RotateGizmo ( gizmos, nodes ) {
    var rotList = [], offsetList = [],
        self = this,
        center
        ;

    this._gizmos = gizmos;
    this._nodes = nodes;
    this._rotating = false;

    this._rotationTool = Editor.GizmosUtils.rotationTool( gizmos.scene, {
        start: function () {
            var i;

            self._rotating = true;
            rotList = [];

            for (i = 0; i < nodes.length; ++i) {
                rotList.push(nodes[i].rotation);
            }

            if (self._gizmos.pivot === 'center') {
                center = Editor.GizmosUtils.getCenter(nodes);
                offsetList.length = 0;
                for (i = 0; i < nodes.length; ++i) {
                    offsetList.push(nodes[i].scenePosition.sub(center));
                }
            }
        },

        update: function (delta) {
            var i, rot, deltaInt;

            deltaInt = Math.floor(delta);

            if (self._gizmos.pivot === 'center') {
                for (i = 0; i < rotList.length; ++i) {
                    rot = Math.deg180(rotList[i] - deltaInt);
                    rot = Math.floor(rot);

                    var offset = offsetList[i].rotate(Math.deg2rad(deltaInt));
                    nodes[i].scenePosition = center.add(offset);
                    nodes[i].rotation = rot;

                    this.rotation = -delta;
                }
            }
            else {
                for (i = 0; i < rotList.length; ++i) {
                    rot = Math.deg180(rotList[i] - deltaInt);
                    rot = Math.floor(rot);
                    nodes[i].rotation = rot;
                }
            }

            self.repaint();
        },

        end: function () {
            if (self._gizmos.pivot === 'center') {
                var scenePos = Editor.GizmosUtils.getCenter(nodes);
                var screenPos = self._gizmos.sceneToPixel(scenePos.x, scenePos.y);

                screenPos.x = Editor.GizmosUtils.snapPixel(screenPos.x);
                screenPos.y = Editor.GizmosUtils.snapPixel(screenPos.y);

                this.rotation = 0;
                this.position = screenPos;

                this.translate(this.position.x, this.position.y)
                    .rotate(this.rotation, 0.0, 0.0)
                    ;
            }
            self._rotating = false;
        }
    });
    this.repaint();
}

RotateGizmo.prototype.repaint = function () {
    var activeTarget = this._nodes[0];
    var scenePos, screenPos, rotation;

    if (this._gizmos.pivot === 'center') {
        if (this._rotating) {
            this._rotationTool.rotate(this._rotationTool.rotation, 0.0, 0.0);
            return;
        }

        scenePos = Editor.GizmosUtils.getCenter(this._nodes);
        screenPos = this._gizmos.sceneToPixel(scenePos.x, scenePos.y);
    }
    else {
        scenePos = activeTarget.scenePosition;
        screenPos = this._gizmos.sceneToPixel(scenePos.x, scenePos.y);
        rotation = activeTarget.sceneRotation;
    }

    screenPos.x = Editor.GizmosUtils.snapPixel(screenPos.x);
    screenPos.y = Editor.GizmosUtils.snapPixel(screenPos.y);

    this._rotationTool.position = screenPos;
    this._rotationTool.rotation = rotation;

    this._rotationTool
        .translate(this._rotationTool.position.x, this._rotationTool.position.y)
        .rotate(this._rotationTool.rotation, 0.0, 0.0)
        ;
};

RotateGizmo.prototype.remove = function () {
    this._rotationTool.remove();
};

module.exports = RotateGizmo;
