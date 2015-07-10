function ParticleGizmo ( gizmos, node ) {
    this.hovering = false;
    this.selecting = false;
    this.editing = false;

    this._node = node;
    this._gizmos = gizmos;

    this._icon = Editor.GizmosUtils.icon(gizmos.scene,
                                         'packages://ui-gizmos/static/particle-gizmo.png',
                                         40,
                                         40,
                                         node);
}

ParticleGizmo.prototype.repaint = function () {
    var s = Math.clamp(this._gizmos.scale, 0.5, 2);

    var screenPos = this._gizmos.sceneToPixel(this._node.scenePosition);
    screenPos.x = Editor.GizmosUtils.snapPixel(screenPos.x);
    screenPos.y = Editor.GizmosUtils.snapPixel(screenPos.y);
    var rotation = this._node.sceneRotation;

    this._icon
        .scale(s,s)
        .translate(screenPos.x, screenPos.y)
        // .rotate(rotation, 0.0, 0.0)
        ;
};

ParticleGizmo.prototype.remove = function () {
    this._icon.remove();
};

module.exports = ParticleGizmo;
