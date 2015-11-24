(function () {
'use strict';

const SVG = require('svg.js');

Editor.registerElement({
    properties: {
        scale: {
            type: Number,
            value: 1.0,
        },

        transformTool: {
            type: String,
            value: 'move',
            observer: '_updateTransformGizmo'
        },

        coordinate: {
            type: String,
            value: 'local',
            observer: '_updateTransformGizmo'
        },

        pivot: {
            type: String,
            value: 'pivot',
            observer: '_updateTransformGizmo'
        },

        designSize: {
            type: Array,
            value: function () {
                return [ 640, 480 ];
            }
        },
    },

    created: function () {
    },

    ready: function () {
        this._selection = [];

        this._svg = SVG(this.$.svg);
        this._svg.spof();

        this.background = this._svg.group();
        this.scene = this._svg.group();
        this.foreground = this._svg.group();
    },

    attached: function () {
        this.async(function() {
            this.lightDomReady();
        });
    },

    lightDomReady: function() {
        this.resize();
    },

    resize: function ( w, h ) {
        if ( !w || !h ) {
            var bcr = this.$.view.getBoundingClientRect();
            w = w || bcr.width;
            h = h || bcr.height;

            w = Math.round(w);
            h = Math.round(h);
        }

        this._svg.size( w, h );
        this._svg.spof();
    },

    update: function () {
        if ( this._transformGizmo ) {
            this._transformGizmo.update();
        }

        this.updateDesignRect();
    },

    repaintHost: function () {
        if ( cc.engine ) {
            cc.engine.repaintInEditMode();
        }
    },

    // override this function to make it work with your scene-view
    sceneToPixel: function (v2) { return v2; },

    // override this function to make it work with your scene-view
    worldToPixel: function (v2) { return v2; },

    // override this function to make it work with your scene-view
    pixelToScene: function (v2) { return v2; },

    // override this function to make it work with your scene-view
    pixelToWorld: function (v2) { return v2; },

    updateDesignRect: function () {
        if ( !this._designRect ) {
            this._designRect = this.background.rect().back();
        }

        var start = this.sceneToPixel( cc.v2(0,0) );
        var end = this.sceneToPixel( cc.v2(this.designSize[0],this.designSize[1]) );

        var x = Editor.GizmosUtils.snapPixel(start.x);
        var y = Editor.GizmosUtils.snapPixel(start.y);
        var w = Editor.GizmosUtils.snapPixel(end.x) - x;
        var h = Editor.GizmosUtils.snapPixel(end.y) - y;

        if ( w < 0.0 ) {
            x += w;
            w = -w;
        }
        if ( h < 0.0 ) {
            y += h;
            h = -h;
        }

        this._designRect
            .move( x, y )
            .size( w, h )
            .fill('none')
            .stroke( { width: 1, color: '#f0f', opacity: 0.8 } )
            ;
    },

    updateSelectRect: function ( x, y, w, h ) {
        if ( !this._selectRect ) {
            this._selectRect = this.foreground.rect().front();
        }

        this._selectRect
            .move( Editor.GizmosUtils.snapPixel(x), Editor.GizmosUtils.snapPixel(y) )
            .size( w, h )
            .fill( { color: 'rgba(0,128,255,0.4)' } )
            .stroke( { width: 1, color: '#09f', opacity: 1.0 } )
            ;
    },

    fadeoutSelectRect: function() {
        if (!this._selectRect) {
            return;
        }
        var selectRect = this._selectRect;
        selectRect.animate(200, '-').opacity(0.0).after(function() {
            selectRect.remove();
        });
        this._selectRect = null;
    },

    rectHitTest: function(x, y, w, h) {
        var rect = this._svg.node.createSVGRect();
        rect.x = x;
        rect.y = y;
        rect.width = w;
        rect.height = h;
        var els = this._svg.node.getIntersectionList(rect, null);
        var results = [];
        for (var i = 0; i < els.length; ++i) {
            var el = els[i];
            var node = el.instance;
            if (node && node.selectable) {
                results.push(node);
            }
        }
        return results;
    },

    reset: function () {
        this._selection = [];
        if ( this._transformGizmo ) {
            this._transformGizmo.remove();
            this._transformGizmo = null;
        }
        if ( this._selectRect ) {
            this._selectRect.remove();
            this._selectRect = null;
        }
        if ( this._designRect ) {
            this._designRect.remove();
            this._designRect = null;
        }

        this.background.clear();
        this.scene.clear();
        this.foreground.clear();
    },

    select: function ( ids ) {
        this._selection = this._selection.concat(ids);
        var nodes = [];

        for ( var i = 0; i < this._selection.length; ++i ) {
            var id = this._selection[i];
            var node = cc.engine.getInstanceById(id);

            if ( node && node.gizmo ) {
                node.gizmo.selecting = true;
                node.gizmo.editing = false;
            }
            nodes.push(node);
        }

        this.edit(nodes);
    },

    unselect: function ( ids ) {
        for ( var i = 0; i < ids.length; ++i ) {
            var id = ids[i];
            for ( var j = 0; j < this._selection.length; ++j ) {
                if ( this._selection[j] === id ) {
                    this._selection.splice(j,1);
                    break;
                }
            }

            var node = cc.engine.getInstanceById(id);
            if ( node && node.gizmo ) {
                node.gizmo.selecting = false;
                node.gizmo.editing = false;
            }
        }

        var nodes = this._selection.map(function ( id ) {
            var node = cc.engine.getInstanceById(id);
            return node;
        });

        this.edit(nodes);
    },

    edit: function ( nodes ) {
        if ( nodes.length === 0 ) {
            if ( this._transformGizmo ) {
                this._transformGizmo._nodes = [];
            }
            this.repaintHost();
            return;
        }

        if ( nodes.length === 1 ) {
            var node = nodes[0];
            if ( node.gizmo ) {
                node.gizmo.selecting = false;
                node.gizmo.editing = true;
            }
        }

        //
        var gizmoDef;
        switch ( this.transformTool ) {
            case 'move': gizmoDef = Editor.gizmos.move; break;
            case 'rotate': gizmoDef = Editor.gizmos.rotate; break;
            case 'scale': gizmoDef = Editor.gizmos.scale; break;
            case 'rect': gizmoDef = Editor.gizmos.rect; break;
        }

        if ( !gizmoDef ) {
            Editor.error( 'Unknown transform tool %s', this.transformTool );
            this.repaintHost();
            return;
        }

        if ( this._transformGizmo && this._transformGizmo instanceof gizmoDef ) {
            this._transformGizmo._nodes = nodes;
        }
        else {
            if ( this._transformGizmo ) {
                this._transformGizmo.remove();
            }
            this._transformGizmo = new gizmoDef( this, nodes );
            this._transformGizmo.update();
        }

        this.repaintHost();
    },

    hoverin: function ( id ) {
        var node = cc.engine.getInstanceById(id);
        if ( node && node.gizmo ) {
            node.gizmo.hovering = true;
            this.repaintHost();
        }
    },

    hoverout: function ( id ) {
        var node = cc.engine.getInstanceById(id);
        if ( node && node.gizmo ) {
            node.gizmo.hovering = false;
            this.repaintHost();
        }
    },

    _updateTransformGizmo: function () {
        if ( this._transformGizmo ) {
            this.edit(this._transformGizmo._nodes);
        }
    },
});

})();
