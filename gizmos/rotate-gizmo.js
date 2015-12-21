function RotateGizmo ( gizmosView, nodes ) {
    var rotList = [], offsetList = [],
        self = this,
        center
        ;

    this._gizmosView = gizmosView;
    this._nodes = nodes;
    this._rotating = false;

    this._rotationTool = Editor.GizmosUtils.rotationTool( self._gizmosView.foreground, {
        start: function () {
            Editor.sendToWindows('gizmos:start-operation');

            var i;

            self._rotating = true;
            rotList = [];

            for (i = 0; i < self._nodes.length; ++i) {
                rotList.push(self._nodes[i].rotation);
            }

            if (self._gizmosView.pivot === 'center') {
                center = Editor.GizmosUtils.getCenter(self._nodes);
                offsetList.length = 0;
                for (i = 0; i < self._nodes.length; ++i) {
                    offsetList.push(self._nodes[i].scenePosition.sub(center));
                }
            }
        },

        update: function (delta) {
            self._nodes.forEach( node => {
                _Scene.Undo.recordObject( node.uuid );
            });

            var i, rot, deltaInt;

            deltaInt = Math.floor(delta);

            if (self._gizmosView.pivot === 'center') {
                for (i = 0; i < rotList.length; ++i) {
                    rot = Math.deg180(rotList[i] - deltaInt);
                    rot = Math.floor(rot);

                    var offset = offsetList[i].rotate(Math.deg2rad(deltaInt));
                    self._nodes[i].scenePosition = center.add(offset);
                    self._nodes[i].rotation = rot;

                    this.rotation = -delta;
                }
            }
            else {
                for (i = 0; i < rotList.length; ++i) {
                    rot = Math.deg180(rotList[i] - deltaInt);
                    rot = Math.floor(rot);
                    self._nodes[i].rotation = rot;
                }
            }

            self._gizmosView.repaintHost();

            _Scene.AnimUtils.recordNodeChanged(self._nodes);
        },

        end: function () {
            if (self._gizmosView.pivot === 'center') {
                var scenePos = Editor.GizmosUtils.getCenter(self._nodes);
                var screenPos = self._gizmosView.sceneToPixel(scenePos);

                screenPos.x = Editor.GizmosUtils.snapPixel(screenPos.x);
                screenPos.y = Editor.GizmosUtils.snapPixel(screenPos.y);

                this.rotation = 0;
                this.position = screenPos;

                this.translate(this.position.x, this.position.y)
                    .rotate(this.rotation, 0.0, 0.0)
                    ;
            }
            self._rotating = false;

            Editor.sendToWindows('gizmos:end-operation');
            _Scene.Undo.commit();
        }
    });
}

RotateGizmo.prototype.update = function () {
    var activeTarget = this._nodes[0];
    var isTargetValid = activeTarget && activeTarget.isValid;

    if (!isTargetValid) {
        this._rotationTool.hide();
        return;
    }

    this._rotationTool.show();

    var scenePos, screenPos, rotation;

    if (this._gizmosView.pivot === 'center') {
        if (this._rotating) {
            this._rotationTool.rotate(this._rotationTool.rotation, 0.0, 0.0);
            return;
        }

        scenePos = Editor.GizmosUtils.getCenter(this._nodes);
        screenPos = this._gizmosView.sceneToPixel(scenePos);
    }
    else {
        scenePos = activeTarget.scenePosition;
        screenPos = this._gizmosView.sceneToPixel(scenePos);
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
