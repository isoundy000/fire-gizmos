'use strict';

var snapPixelWihVec2 = Editor.GizmosUtils.snapPixelWihVec2;

function NodeGizmo ( gizmosView, node ) {
    this.hovering = false;
    this.selecting = false;
    this.editing = false;

    this._node = node;
    this._gizmosView = gizmosView;
    this._selectTool = null;
}

NodeGizmo.prototype.ensureSelectTool = function () {
    if ( !this._selectTool ) {
        this._selectTool = this._gizmosView.scene.group();
        this._selectTool.bounds = this._selectTool.polygon();

        var errorInfo = this._selectTool.errorInfo = this._selectTool.group();
        errorInfo.l1 = errorInfo.line( 0, 0, 0, 0 ).stroke( { width: 1, color: '#f00' } );
        errorInfo.l2 = errorInfo.line( 0, 0, 0, 0 ).stroke( { width: 1, color: '#f00' } );
    }
};

NodeGizmo.prototype.hideSelectTool = function () {
    if ( this._selectTool ) {
        this._selectTool.hide();
    }
};

NodeGizmo.prototype.update = function () {

    var editing  = this.selecting || this.editing;
    var hovering = this.hovering;
    var sizeNegative = this._node.width < 0 || this._node.height < 0;

    if (!editing && !hovering && !sizeNegative) {
        this.hideSelectTool();
        return;
    }

    this.ensureSelectTool();
    this._selectTool.show();

    var bounds = this._node.getWorldOrientedBounds();
    var v1 = snapPixelWihVec2( this._gizmosView.worldToPixel(bounds[0]) );
    var v2 = snapPixelWihVec2( this._gizmosView.worldToPixel(bounds[1]) );
    var v3 = snapPixelWihVec2( this._gizmosView.worldToPixel(bounds[2]) );
    var v4 = snapPixelWihVec2( this._gizmosView.worldToPixel(bounds[3]) );

    if (sizeNegative) {
        var errorInfo = this._selectTool.errorInfo.show();
        errorInfo.l1.plot(v1.x, v1.y, v3.x, v3.y);
        errorInfo.l2.plot(v4.x, v4.y, v2.x, v2.y);
    }
    else {
        this._selectTool.errorInfo.hide();
    }

    if (editing || hovering) {
        this._selectTool.bounds.show();

        this._selectTool.bounds.plot([
            [v1.x, v1.y],
            [v2.x, v2.y],
            [v3.x, v3.y],
            [v4.x, v4.y]
        ])
        .fill('none');

        if ( editing ) {
            this._selectTool.bounds.stroke({color: '#09f', width: 1});
        }
        else if ( hovering ) {
            this._selectTool.bounds.stroke({color: '#999', width: 1});
        }
    }
    else {
        this._selectTool.bounds.hide();
    }
};

NodeGizmo.prototype.remove = function () {
    if ( this._selectTool ) {
        this._selectTool.remove();
        this._selectTool = null;
    }
};

module.exports = NodeGizmo;
