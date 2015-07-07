(function () {
Editor.registerWidget( 'svg-gizmos', {
    is: 'svg-gizmos',

    properties: {
    },

    created: function () {

    },

    ready: function () {
        this._svg = SVG(this.$.svg);
        this._svg.spof();

        this._scene = this._svg.group();
        this._foreground = this._svg.group();

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
        this.repaint();
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

    repaint: function () {
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
});

})();
