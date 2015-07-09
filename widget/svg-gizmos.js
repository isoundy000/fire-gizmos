(function () {
Editor.registerWidget( 'svg-gizmos', {
    is: 'svg-gizmos',

    properties: {
        scale: {
            type: Number,
            value: 1.0,
        },

        transformTool: {
            type: String,
            value: 'move',
        },

        coordinate: {
            type: String,
            value: 'local',
        },

        pivot: {
            type: String,
            value: 'pivot',
        },
    },

    created: function () {
    },

    ready: function () {
        this._svg = SVG(this.$.svg);
        this._svg.spof();

        this._foreground = this._svg.group();

        this.scene = this._svg.group();

        // TODO
        // this._gizmos = [];
        // this._gizmosTable = {}; // entity to gizmo
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
    },

    // override this function to make it work with your scene-view
    sceneToPixel: function ( x, y ) {
        return Fire.v2(x,y);
    },

    // override this function to make it work with your scene-view
    pixelToScene: function ( x, y ) {
        return Fire.v2(x,y);
    },

    updateSelectRect: function ( x, y, w, h ) {
        if ( !this._selectRect ) {
            this._selectRect = this._foreground.rect();
        }

        this._selectRect
            .move( x, y )
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

    edit: function ( nodes ) {
        if ( this._transformGizmo ) {
            this._transformGizmo.remove();
            this._transformGizmo = null;
        }

        if ( nodes.length === 0 ) {
            return;
        }

        //
        switch ( this.transformTool ) {
            case 'move':
                this._transformGizmo = new Editor.gizmos.move( this, nodes );
            break;

            case 'rotate':
                this._transformGizmo = new Editor.gizmos.rotate( this, nodes );
            break;

            case 'scale':
                this._transformGizmo = new Editor.gizmos.scale( this, nodes );
            break;
        }
    },
});

})();
