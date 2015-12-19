'use strict';

const Chroma = require('chroma-js');

var GizmosUtils = {};
module.exports = GizmosUtils;

function _addMoveHandles ( gizmo, cursor, callbacks ) {
    var pressx, pressy;

    if (typeof cursor !== 'string') {
        callbacks = cursor;
        cursor = 'default';
    }

    //
    var mousemoveHandle = function(event) {
        var dx = event.clientX - pressx;
        var dy = event.clientY - pressy;

        if ( callbacks.update ) {
            callbacks.update.call( gizmo, dx, dy );
        }

        event.stopPropagation();
    }.bind(gizmo);

    var mouseupHandle = function(event) {
        document.removeEventListener('mousemove', mousemoveHandle);
        document.removeEventListener('mouseup', mouseupHandle);
        EditorUI.removeDragGhost();

        if ( callbacks.end ) {
            callbacks.end.call( gizmo );
        }

        event.stopPropagation();
    }.bind(gizmo);

    gizmo.on( 'mousedown', function ( event ) {
        if (callbacks.ignoreMouseDown && callbacks.ignoreMouseDown(event)) {
            return;
        }

        if ( event.which === 1 ) {
            pressx = event.clientX;
            pressy = event.clientY;

            EditorUI.addDragGhost(cursor);
            document.addEventListener ( 'mousemove', mousemoveHandle );
            document.addEventListener ( 'mouseup', mouseupHandle );

            if ( callbacks.start ) {
                callbacks.start.call ( gizmo, event.offsetX, event.offsetY );
            }
        }
        event.stopPropagation();
    } );
}

GizmosUtils._addMoveHandles = _addMoveHandles;

GizmosUtils.snapPixel = function (p) {
    return Math.floor(p) + 0.5;
};

GizmosUtils.snapPixelWihVec2 = function (vec2) {
    vec2.x = GizmosUtils.snapPixel(vec2.x);
    vec2.y = GizmosUtils.snapPixel(vec2.y);
    return vec2;
};

GizmosUtils.getCenter = function ( nodes ) {
    var minX = null, minY = null, maxX = null, maxY = null;
    for ( var i = 0; i < nodes.length; ++i ) {
        var v, node = nodes[i];
        var bounds = node.getWorldOrientedBounds();

        for ( var j = 0; j < bounds.length; ++j ) {
            v = bounds[j];

            if ( minX === null || v.x < minX )
                minX = v.x;
            if ( maxX === null || v.x > maxX )
                maxX = v.x;

            if ( minY === null || v.y < minY )
                minY = v.y;
            if ( maxY === null || v.y > maxY )
                maxY = v.y;
        }

        v = node.worldPosition;

        if ( !minX || v.x < minX )
            minX = v.x;
        if ( !maxX || v.x > maxX )
            maxX = v.x;

        if ( !minY || v.y < minY )
            minY = v.y;
        if ( !maxY || v.y > maxY )
            maxY = v.y;
    }

    var centerX = (minX + maxX) * 0.5;
    var centerY = (minY + maxY) * 0.5;


    var scene = cc.director.getScene();
    var scenePos = scene.convertToNodeSpaceAR( cc.v2(centerX,centerY) );
    return scenePos;
};

GizmosUtils.scaleSlider = function ( svg, size, color, callbacks ) {
    var group = svg.group();
    var line = group.line( 0, 0, size, 0 )
                    .stroke( { width: 1, color: color } )
                    ;
    var rect = group.polygon ([ [size, 5], [size, -5], [size+10, -5], [size+10, 5] ])
                    .fill( { color: color } )
                    ;
    var dragging = false;

    group.style( 'pointer-events', 'bounding-box' );

    group.resize = function ( size ) {
        line.plot( 0, 0, size, 0 );
        rect.plot([ [size, 5], [size, -5], [size+10, -5], [size+10, 5] ]);
    };

    group.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        line.stroke( { color: lightColor } );
        rect.fill( { color: lightColor } );

        // DELME?
        // event.stopPropagation();
        // this.node.dispatchEvent( new CustomEvent('gizmoshover', {
        //     detail: { entity: null }
        // } ) );
    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            line.stroke( { color: color } );
            rect.fill( { color: color } );
        }
    } );

    _addMoveHandles( group, {
        start: function () {
            dragging = true;
            line.stroke( { color: "#ff0" } );
            rect.fill( { color: "#ff0" } );

            if ( callbacks.start )
                callbacks.start ();
        },

        update: function ( dx, dy ) {
            if ( callbacks.update )
                callbacks.update ( dx, dy );
        },

        end: function () {
            dragging = false;
            line.stroke( { color: color } );
            rect.fill( { color: color } );

            if ( callbacks.end )
                callbacks.end ();
        }
    }  );

    return group;
};

GizmosUtils.freemoveTool = function ( svg, size, color, callbacks ) {
    // move rect
    var dragging = false;
    var circle = svg.circle( size, size )
                    .move( -size * 0.5, -size * 0.5 )
                    .fill( { color: color, opacity: 0.6 } )
                    .stroke( { width: 2, color: color } )
                    ;
    // swallow mousemove event to prevent scene-view mousemove
    circle.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    circle.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        this.fill( { color: lightColor } )
            .stroke( { color: lightColor } )
            ;
        // DELME?
        // event.stopPropagation();
        // this.node.dispatchEvent( new CustomEvent('gizmoshover', {
        //     detail: { entity: null }
        // } ) );
    } );
    circle.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;
        }
    } );
    _addMoveHandles( circle, {
        start: function ( x, y ) {
            dragging = true;
            this.fill( { color: "#cc5" } )
                .stroke( { color: "#cc5" } )
                ;

            if ( callbacks.start )
                callbacks.start( x, y );
        },

        update: function ( dx, dy ) {
            if ( callbacks.update )
                callbacks.update(dx, dy);
        },

        end: function () {
            dragging = false;
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;

            if ( callbacks.end )
                callbacks.end();
        }
    } );

    return circle;
};

GizmosUtils.arrowTool = function ( svg, size, color, callbacks ) {
    var group = svg.group();
    var line = group.line( 0, 0, size, 0 )
                    .stroke( { width: 1, color: color } )
                    ;
    var arrow = group.polygon ([ [size, 5], [size, -5], [size+15, 0] ])
                     .fill( { color: color } )
                     ;
    var dragging = false;

    group.style( 'pointer-events', 'bounding-box' );

    group.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        line.stroke( { color: lightColor } );
        arrow.fill( { color: lightColor } );

        // DELME?
        // event.stopPropagation();
        // this.node.dispatchEvent( new CustomEvent('gizmoshover', {
        //     detail: { entity: null }
        // } ) );
    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            line.stroke( { color: color } );
            arrow.fill( { color: color } );
        }
    } );

    _addMoveHandles( group, {
        start: function () {
            dragging = true;
            line.stroke( { color: "#ff0" } );
            arrow.fill( { color: "#ff0" } );

            if ( callbacks.start )
                callbacks.start ();
        },

        update: function ( dx, dy ) {
            if ( callbacks.update )
                callbacks.update ( dx, dy );
        },

        end: function () {
            dragging = false;
            line.stroke( { color: color } );
            arrow.fill( { color: color } );

            if ( callbacks.end )
                callbacks.end ();
        }
    }  );

    return group;
};

GizmosUtils.positionTool = function ( svg, callbacks ) {
    var group = svg.group();
    var xarrow, yarrow, moveRect;

    group.position = cc.v2(0,0);
    group.rotation = 0.0;

    // x-arrow
    xarrow = GizmosUtils.arrowTool( svg, 80, "#f00", {
        start: function () {
            if ( callbacks.start )
                callbacks.start.call(group);
        },
        update: function ( dx, dy ) {
            var radius = Math.deg2rad(group.rotation);
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            if ( callbacks.update ) {
                callbacks.update.call(group, dirx * length, diry * length );
            }
        },
        end: function () {
            if ( callbacks.end )
                callbacks.end.call(group);
        },
    } );
    xarrow.translate( 20, 0 );
    group.add(xarrow);

    // y-arrow
    yarrow = GizmosUtils.arrowTool( svg, 80, "#5c5", {
        start: function () {
            if ( callbacks.start )
                callbacks.start.call(group);
        },
        update: function ( dx, dy ) {
            var radius = Math.deg2rad(group.rotation + 90.0);
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            if ( callbacks.update ) {
                callbacks.update.call(group, dirx * length, diry * length );
            }
        },
        end: function () {
            if ( callbacks.end )
                callbacks.end.call(group);
        },
    } );
    yarrow.translate( 0, -20 );
    yarrow.rotate(-90, 0, 0 );
    group.add(yarrow);

    // move rect
    var color = "#05f";
    var dragging = false;
    moveRect = group.rect( 20, 20 )
                        .move( 0, -20 )
                        .fill( { color: color, opacity: 0.4 } )
                        .stroke( { width: 1, color: color } )
                        ;
    // swallow mousemove event to prevent scene-view mousemove
    moveRect.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    moveRect.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        this.fill( { color: lightColor } )
            .stroke( { color: lightColor } )
            ;

        // DELME?
        // event.stopPropagation();
        // this.node.dispatchEvent( new CustomEvent('gizmoshover', {
        //     detail: { entity: null }
        // } ) );
    } );
    moveRect.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;
        }
    } );
    _addMoveHandles( moveRect, {
        start: function () {
            dragging = true;
            this.fill( { color: "#cc5" } )
                .stroke( { color: "#cc5" } )
                ;

            if ( callbacks.start )
                callbacks.start.call(group);
        },

        update: function ( dx, dy ) {
            if ( callbacks.update )
                callbacks.update.call(group, dx, dy );
        },

        end: function () {
            dragging = false;
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;

            if ( callbacks.end )
                callbacks.end.call(group);
        }
    } );

    return group;
};

GizmosUtils.rotationTool = function ( svg, callbacks ) {
    var group = svg.group();
    var circle, line, arrow, arc, txtDegree;
    var dragging = false;
    var color = "#f00";

    group.position = new cc.Vec2(0,0);
    group.rotation = 0.0;

    // circle
    circle = group.path('M50,-10 A50,50, 0 1,0 50,10')
                  .fill( "none" )
                  .stroke( { width: 2, color: color } )
                  ;

    arc = group.path()
               .fill( {color: color, opacity: 0.4} )
               .stroke( { width: 1, color: color } )
               ;
    arc.hide();

    // arrow
    var size = 50;
    line = group.line( 0, 0, size, 0 )
                .stroke( { width: 1, color: color } )
                ;
    arrow = group.polygon ([ [size, 5], [size, -5], [size+15, 0] ])
                 .fill( { color: color } )
                 ;

    //
    txtDegree = group.text("0")
                     .plain("")
                     .fill( { color: "white" } )
                     .font( {
                         anchor: 'middle',
                     })
                     .hide()
                     .translate( 30, 0 )
                     ;

    group.style( 'pointer-events', 'visibleFill' );
    group.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        circle.stroke( { color: lightColor } );
        line.stroke( { color: lightColor } );
        arrow.fill( { color: lightColor } );

        // DELME?
        // event.stopPropagation();
        // this.node.dispatchEvent( new CustomEvent('gizmoshover', {
        //     detail: { entity: null }
        // } ) );
    } );
    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            circle.stroke( { color: color } );
            line.stroke( { color: color } );
            arrow.fill( { color: color } );
        }
    } );

    var x1, y1;
    _addMoveHandles( group, {
        start: function ( x, y ) {
            dragging = true;
            circle.stroke( { color: "#cc5" } );
            line.stroke( { color: "#cc5" } );
            arrow.fill( { color: "#cc5" } );

            arc.show();
            arc.plot( 'M40,0 A40,40, 0 0,1 40,0 L0,0 Z' );

            txtDegree.plain("0\xB0");
            txtDegree.rotate(0, -30, 0);
            txtDegree.show();

            x1 = x - group.position.x;
            y1 = y - group.position.y;

            if ( callbacks.start )
                callbacks.start.call(group);
        },

        update: function ( dx, dy ) {
            var v1 = new cc.Vec2( x1,    y1    );
            var v2 = new cc.Vec2( x1+dx, y1+dy );

            var magSqr1 = v1.magSqr();
            var magSqr2 = v2.magSqr();

            //
            if ( magSqr1 > 0 && magSqr2 > 0 ) {
                var dot = v1.dot(v2);
                var cross = v1.cross(v2);
                var alpha = Math.sign(cross) * Math.acos( dot / Math.sqrt(magSqr1 * magSqr2) );

                var dirx = Math.cos(alpha);
                var diry = Math.sin(alpha);
                var angle = Math.rad2deg(alpha);

                txtDegree.rotate(angle, -30, 0);
                if ( alpha > 0.0 ) {
                    arc.plot( 'M40,0 A40,40, 0 0,1 ' + dirx*40 + ',' + diry*40 + ' L0,0' );
                    txtDegree.plain( "+" + angle.toFixed(0) + "\xB0" );
                }
                else {
                    arc.plot( 'M40,0 A40,40, 0 0,0 ' + dirx*40 + ',' + diry*40 + ' L0,0' );
                    txtDegree.plain( angle.toFixed(0) + "\xB0" );
                }
            }

            //
            var theta = Math.atan2( v1.y, v1.x ) - Math.atan2( v2.y, v2.x );
            if ( callbacks.update )
                callbacks.update.call(group, Math.rad2deg(theta) );
        },

        end: function () {
            dragging = false;
            circle.stroke( { color: color } );
            line.stroke( { color: color } );
            arrow.fill( { color: color } );

            arc.hide();
            txtDegree.hide();

            if ( callbacks.end )
                callbacks.end.call(group);
        }
    } );

    return group;
};

GizmosUtils.scaleTool = function ( svg, callbacks ) {
    var group = svg.group();
    var xarrow, yarrow, scaleRect;

    group.position = new cc.Vec2(0,0);
    group.rotation = 0.0;

    // x-slider
    xarrow = GizmosUtils.scaleSlider( svg, 100, "#f00", {
        start: function () {
            if ( callbacks.start )
                callbacks.start.call(group);
        },
        update: function ( dx, dy ) {
            var radius = group.rotation * Math.PI / 180.0;
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            xarrow.resize( length + 100 );

            if ( callbacks.update ) {
                callbacks.update.call(group, length/100.0, 0.0 );
            }
        },
        end: function () {
            xarrow.resize( 100 );

            if ( callbacks.end )
                callbacks.end.call(group);
        },
    } );
    group.add(xarrow);

    // y-slider
    yarrow = GizmosUtils.scaleSlider( svg, 100, "#5c5", {
        start: function () {
            if ( callbacks.start )
                callbacks.start.call(group);
        },
        update: function ( dx, dy ) {
            var radius = (group.rotation + 90.0) * Math.PI / 180.0;
            var dirx = Math.cos(radius);
            var diry = Math.sin(radius);

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            yarrow.resize( -1.0 * length + 100 );

            if ( callbacks.update ) {
                callbacks.update.call(group, 0.0, length/100.0 );
            }
        },
        end: function () {
            yarrow.resize( 100 );

            if ( callbacks.end )
                callbacks.end.call(group);
        },
    } );
    yarrow.rotate(-90, 0, 0 );
    group.add(yarrow);


    // scaleRect
    var color = "#aaa";
    var dragging = false;
    scaleRect = group.rect( 20, 20 )
                        .move( -10, -10 )
                        .fill( { color: color, opacity: 0.4 } )
                        .stroke( { width: 1, color: color } )
                        ;
    scaleRect.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    scaleRect.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        this.fill( { color: lightColor } )
            .stroke( { color: lightColor } )
            ;

        // DELME?
        // event.stopPropagation();
        // this.node.dispatchEvent( new CustomEvent('gizmoshover', {
        //     detail: { entity: null }
        // } ) );
    } );
    scaleRect.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;
        }
    } );
    _addMoveHandles( scaleRect, {
        start: function () {
            dragging = true;
            this.fill( { color: "#cc5" } )
                .stroke( { color: "#cc5" } )
                ;

            if ( callbacks.start )
                callbacks.start.call(group);
        },

        update: function ( dx, dy ) {
            var dirx = 1.0;
            var diry = -1.0;

            var length = Math.sqrt(dx * dx + dy * dy);
            var theta = Math.atan2( diry, dirx ) - Math.atan2( dy, dx );
            length = length * Math.cos(theta);

            xarrow.resize( length + 100 );
            yarrow.resize( length + 100 );

            if ( callbacks.update )
                callbacks.update.call(group, dirx * length/100.0, diry * length/100.0 );
        },

        end: function () {
            dragging = false;
            this.fill( { color: color } )
                .stroke( { color: color } )
                ;

            xarrow.resize( 100 );
            yarrow.resize( 100 );

            if ( callbacks.end )
                callbacks.end.call(group);
        }
    } );

    return group;
};

GizmosUtils.circleTool = function ( svg, size, fill, stroke, cursor, callbacks ) {
    var point = svg.circle( size )
                    .fill(fill ? fill : 'none')
                    .stroke(stroke ? stroke : 'none')
                    ;
    var dragging = false;

    point.style( 'pointer-events', 'bounding-box' );

    point.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    point.on( 'mouseover', function ( event ) {
        if (fill) {
            var lightColor = Chroma(fill.color).brighter().hex();
            point.fill( { color: lightColor } );
        }

        if (stroke) {
            var lightColor = Chroma(stroke.color).brighter().hex();
            point.stroke( { color: lightColor } );
        }

    } );

    point.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            if (fill) point.fill(fill);
            if (stroke) point.stroke(stroke);
        }
    } );

    _addMoveHandles( point, cursor, {
        start: function () {
            dragging = true;

            if (fill) {
                var superLightColor = Chroma(fill.color).brighter().brighter().hex();
                point.fill( { color: superLightColor } );
            }

            if (stroke) {
                var superLightColor = Chroma(stroke.color).brighter().brighter().hex();
                point.stroke( { color: superLightColor } );
            }

            if ( callbacks.start )
                callbacks.start ();
        },

        update: function ( dx, dy ) {
            if ( callbacks.update )
                callbacks.update ( dx, dy );
        },

        end: function () {
            dragging = false;

            if (fill) point.fill(fill);
            if (stroke) point.stroke(stroke);

            if ( callbacks.end )
                callbacks.end ();
        }
    }  );

    return point;
};

GizmosUtils.lineTool = function ( svg, from, to, color, cursor, callbacks ) {
    var group = svg.group();
    var line = group.line( from.x, from.y, to.x, to.y )
                    .stroke({ width: 1, color: color })
                    ;
    // used for hit test
    var bgline = group.line( from.x, from.y, to.x, to.y)
                    .stroke({ width: 8, color: color })
                    .style('stroke-opacity', 0)
                    ;
    var dragging = false;

    group.on( 'mousemove', function ( event ) {
        event.stopPropagation();
    } );
    group.on( 'mouseover', function ( event ) {
        var lightColor = Chroma(color).brighter().hex();
        line.stroke( { color: lightColor } );
    } );

    group.on( 'mouseout', function ( event ) {
        event.stopPropagation();

        if ( !dragging ) {
            line.stroke( { color: color } );
        }
    } );

    _addMoveHandles( group, cursor, {
        start: function () {
            dragging = true;

            var superLightColor = Chroma(color).brighter().brighter().hex();
            line.stroke( { color: superLightColor } );

            if ( callbacks.start )
                callbacks.start ();
        },

        update: function ( dx, dy ) {
            if ( callbacks.update )
                callbacks.update ( dx, dy );
        },

        end: function () {
            dragging = false;
            line.stroke( { color: color } );

            if ( callbacks.end )
                callbacks.end ();
        }
    } );

    group.plot = function () {
        line.plot.apply(line, arguments);
        bgline.plot.apply(bgline, arguments);
    };

    return group;
};

GizmosUtils.positionLineTool = function ( svg, origin, pos, local, lineColor, textColor ) {
    var group = svg.group();

    var xLine = group.line( origin.x, pos.y, pos.x, pos.y )
                    .stroke({ width: 1, color: lineColor });
    var yLine = group.line( pos.x, origin.y, pos.x, pos.y )
                    .stroke({ width: 1, color: lineColor });

    var xText = group.text('' + local.x).fill(textColor);
    var yText = group.text('' + local.y).fill(textColor);

    group.style('stroke-dasharray', '5 5');
    group.style('stroke-opacity', 0.8);

    group.plot = function (origin, pos, local) {
        xLine.plot.call(yLine, origin.x, pos.y, pos.x, pos.y);
        yLine.plot.call(xLine, pos.x, origin.y, pos.x, pos.y);

        xText.text('' + Math.floor(local.x)).move(origin.x + (pos.x - origin.x) / 2, pos.y);
        yText.text('' + Math.floor(local.y)).move(pos.x, origin.y + (pos.y - origin.y) / 2);
    };

    return group;
};

var RectToolType = {
    None: 0,

    LeftBottom: 1,
    LeftTop: 2,
    RightTop: 3,
    RightBottom: 4,

    Left: 5,
    Right: 6,
    Top: 7,
    Bottom: 8,

    Center: 9,

    Anchor: 10
};

GizmosUtils.rectTool = function (svg, callbacks) {
    var group = svg.group();
    var sizeGroup = group.group();
    var lb, lt, rt, rb;     // size points
    var l, t, r, b;         // size sides
    var rect;               // center rect
    var anchor;             // anchor
    var positionLineTool;   // show dash line along x,y direction
    var sizeTextGroup, widthText, heightText;   // show size info when resize
    var smallDragCircle;    // show when rect is too small

    group.position = cc.v2(0,0);
    group.rotation = 0.0;

    group.type = RectToolType.None;

    function creatToolCallbacks (type) {
        return {
            start: function () {
                group.type = type;

                if ( callbacks.start )
                    callbacks.start.call(group, type);
            },
            update: function ( dx, dy ) {
                if ( callbacks.update ) {
                    callbacks.update.call(group, type, dx, dy);
                }
            },
            end: function () {
                group.type = RectToolType.None;

                if ( callbacks.end )
                    callbacks.end.call(group, type);
            }
        };
    }


    // init center rect
    rect = group.polygon('0,0,0,0,0,0')
                .fill('none')
                .stroke('none')
                ;

    rect.style( 'pointer-events', 'fill' );

    var rectCallBacks = creatToolCallbacks(RectToolType.Center);
    rectCallBacks.ignoreMouseDown = function (event) {
        var selection = Editor.Selection.curSelection('node');
        var node = _Scene.hitTest(event.offsetX, event.offsetY);
        var index = selection.findIndex(function (id) {
            return id === node.uuid;
        });

        return index === -1;
    };

    _addMoveHandles( rect,  rectCallBacks);

    // init small darg circle
    var smallDragCircleSize = 20;

    smallDragCircle = GizmosUtils.circleTool(
        group,
        smallDragCircleSize,
        {color: '#eee', opacity: 0.3},
        {color: '#eee', opacity: 0.5, width: 2},
        creatToolCallbacks(RectToolType.Center)
    );

    // init sides
    function createLineTool(type, cursor) {
        return GizmosUtils.lineTool( sizeGroup, cc.v2(0,0), cc.v2(0,0), '#8c8c8c', cursor, creatToolCallbacks(type)).style('cursor', cursor);
    }

    l = createLineTool(RectToolType.Left, 'col-resize');
    t = createLineTool(RectToolType.Top, 'row-resize');
    r = createLineTool(RectToolType.Right, 'col-resize');
    b = createLineTool(RectToolType.Bottom, 'row-resize');

    // init points
    var pointSize = 8;

    function createPointTool(type, cursor) {
        return GizmosUtils.circleTool( sizeGroup, pointSize, {color: '#0e6dde'}, null, cursor, creatToolCallbacks(type)).style('cursor', cursor);
    }

    lb = createPointTool(RectToolType.LeftBottom, 'nwse-resize');
    lt = createPointTool(RectToolType.LeftTop, 'nesw-resize');
    rt = createPointTool(RectToolType.RightTop, 'nwse-resize');
    rb = createPointTool(RectToolType.RightBottom, 'nesw-resize');

    // init position line tool
    positionLineTool = GizmosUtils.positionLineTool(group, cc.v2(0,0), cc.v2(0,0), cc.v2(0,0), '#8c8c8c', '#eee');

    // init anchor
    var anchorSize = 10;
    anchor = GizmosUtils.circleTool( group, anchorSize, null, {width: 3, color: '#0e6dde'}, creatToolCallbacks(RectToolType.Anchor))
        .style('cursor', 'pointer');

    //init size text
    sizeTextGroup = group.group();
    widthText = sizeTextGroup.text('0').fill('#eee');
    heightText = sizeTextGroup.text('0').fill('#eee');

    // set bounds
    group.setBounds = function (bounds) {

        if (Math.abs(bounds[2].x - bounds[0].x) < 10 &&
            Math.abs(bounds[2].y - bounds[0].y) < 10) {

            sizeGroup.hide();
            anchor.hide();
            smallDragCircle.show();

            smallDragCircle.center(
                bounds[0].x + (bounds[2].x - bounds[0].x)/2,
                bounds[0].y + (bounds[2].y - bounds[0].y)/2
            );
        }
        else {
            sizeGroup.show();
            smallDragCircle.hide();

            rect.plot([
                [bounds[0].x, bounds[0].y],
                [bounds[1].x, bounds[1].y],
                [bounds[2].x, bounds[2].y],
                [bounds[3].x, bounds[3].y]
            ]);

            l.plot(bounds[0].x, bounds[0].y, bounds[1].x, bounds[1].y);
            t.plot(bounds[1].x, bounds[1].y, bounds[2].x, bounds[2].y);
            r.plot(bounds[2].x, bounds[2].y, bounds[3].x, bounds[3].y);
            b.plot(bounds[3].x, bounds[3].y, bounds[0].x, bounds[0].y);

            lb.center(bounds[0].x, bounds[0].y);
            lt.center(bounds[1].x, bounds[1].y);
            rt.center(bounds[2].x, bounds[2].y);
            rb.center(bounds[3].x, bounds[3].y);

            if (bounds.anchor) {
                anchor.show();
                anchor.center(bounds.anchor.x, bounds.anchor.y);
            }
            else {
                anchor.hide();
            }
        }

        if (bounds.origin &&
            (group.type === RectToolType.Center ||
             group.type === RectToolType.Anchor)) {
            positionLineTool.show();
            positionLineTool.plot(bounds.origin, bounds.anchor, bounds.localPosition);
        }
        else {
            positionLineTool.hide();
        }

        if (bounds.localSize &&
            group.type >= RectToolType.LeftBottom &&
            group.type <= RectToolType.Bottom) {
            sizeTextGroup.show();

            widthText.text('' + Math.floor(bounds.localSize.width));
            heightText.text('' + Math.floor(bounds.localSize.height));

            widthText.center(bounds[1].x + (bounds[2].x - bounds[1].x)/2, bounds[1].y + (bounds[2].y - bounds[1].y)/2 + 5);
            heightText.center(bounds[2].x + (bounds[3].x - bounds[2].x)/2 + 15, bounds[2].y + (bounds[3].y - bounds[2].y)/2);
        }
        else {
            sizeTextGroup.hide();
        }
    };

    return group;
};

GizmosUtils.rectTool.Type = RectToolType;

GizmosUtils.icon = function ( svg, url, w, h, hoverNode ) {
    var icon = svg.image(url)
                         .move( -w * 0.5, -h * 0.5 )
                         .size( w, h )
                         ;

    // icon.on( 'mousemove', function ( event ) {
    //     event.stopPropagation();
    // } );

    icon.on( 'mouseover', function ( event ) {
        // event.stopPropagation();
        // var e = new CustomEvent('gizmoshover', {
        //     detail: { entity: hoverEntity },
        // } );
        // this.node.dispatchEvent(e);
    } );

    // icon.on( 'mouseout', function ( event ) {
    //     event.stopPropagation();
    // } );

    return icon;
};
