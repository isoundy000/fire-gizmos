function SpriteGizmo ( gizmosView, node ) {
    this.hovering = false;
    this.selecting = false;
    this.editing = false;

    this._node = node;
    this._gizmosView = gizmosView;
    this._selectTool = null;
}

SpriteGizmo.prototype.ensureSelectTool = function () {
    if ( !this._selectTool ) {
        this._selectTool = this._gizmosView.scene.polygon();
    }
};

SpriteGizmo.prototype.hideSelectTool = function () {
    if ( this._selectTool ) {
        this._selectTool.hide();
    }
};

SpriteGizmo.prototype.repaint = function () {
    var bounds, v1, v2, v3, v4;

    if ( !this.textureUuid ) {
        // TODO:
    }

    if ( this.selecting || this.editing ) {
        this.ensureSelectTool();

        bounds = this._node.getWorldOrientedBounds();
        v1 = this._gizmosView.worldToPixel(bounds[0]);
        v2 = this._gizmosView.worldToPixel(bounds[1]);
        v3 = this._gizmosView.worldToPixel(bounds[2]);
        v4 = this._gizmosView.worldToPixel(bounds[3]);

        this._selectTool.show();
        this._selectTool.plot([
            [Editor.GizmosUtils.snapPixel(v1.x), Editor.GizmosUtils.snapPixel(v1.y)],
            [Editor.GizmosUtils.snapPixel(v2.x), Editor.GizmosUtils.snapPixel(v2.y)],
            [Editor.GizmosUtils.snapPixel(v3.x), Editor.GizmosUtils.snapPixel(v3.y)],
            [Editor.GizmosUtils.snapPixel(v4.x), Editor.GizmosUtils.snapPixel(v4.y)],
        ])
        .fill('none')
        .stroke({color: '#09f', width: 1})
        ;

        return;
    }
    else if ( this.hovering ) {
        this.ensureSelectTool();

        bounds = this._node.getWorldOrientedBounds();
        v1 = this._gizmosView.worldToPixel(bounds[0]);
        v2 = this._gizmosView.worldToPixel(bounds[1]);
        v3 = this._gizmosView.worldToPixel(bounds[2]);
        v4 = this._gizmosView.worldToPixel(bounds[3]);

        this._selectTool.show();
        this._selectTool.plot([
            [Editor.GizmosUtils.snapPixel(v1.x), Editor.GizmosUtils.snapPixel(v1.y)],
            [Editor.GizmosUtils.snapPixel(v2.x), Editor.GizmosUtils.snapPixel(v2.y)],
            [Editor.GizmosUtils.snapPixel(v3.x), Editor.GizmosUtils.snapPixel(v3.y)],
            [Editor.GizmosUtils.snapPixel(v4.x), Editor.GizmosUtils.snapPixel(v4.y)],
        ])
        .fill('none')
        .stroke({color: '#999', width: 1})
        ;

        return;
    }
    else {
        this.hideSelectTool();
        return;
    }
};

SpriteGizmo.prototype.remove = function () {
    if ( this._selectTool ) {
        this._selectTool.remove();
    }
};

module.exports = SpriteGizmo;
