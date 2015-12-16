'use strict';

var v2 = cc.v2;
var _addMoveHandles = Editor.GizmosUtils._addMoveHandles;

function SegmentTool (svg, segment, callbacks) {
    var tool = svg.group();
    tool.segment = segment;
    tool.curveTools = [];

    var controls = tool.group();

    var pos = segment.pos;
    var inPos = segment.inControl;
    var outPos = segment.outControl;

    function selectStyle(svg) {
        return svg.fill({color: '#fff'}).stroke({color: '#000'});
    }

    var inLine = controls.line(pos.x, pos.y, inPos.x, inPos.y).stroke({color: '#eee', width: 1});
    var outLine = controls.line(pos.x, pos.y, outPos.x, outPos.y).stroke({color: '#eee', width: 1});

    var rect = tool.rect(5, 5).style('cursor', 'move');
    rect.center(pos.x, pos.y);

    var inControl = selectStyle(controls.circle(8, 8)).style('cursor', 'move');
    inControl.center(inPos.x, inPos.y);

    var outControl = selectStyle(controls.circle(8, 8)).style('cursor', 'move');
    outControl.center(outPos.x, outPos.y);

    // selection

    tool.select = function () {
        if (callbacks.beforeSelected) {
            callbacks.beforeSelected(tool);
        }

        selectStyle(rect);

        if (!segment.keyframe) {
            controls.show();
        }
    };

    tool.unselect = function () {
        rect.fill({color: '#4793e2'});

        if (!segment.keyframe) {
            controls.hide();
        }
    };

    var originShow = tool.show;
    tool.show = function () {
        var pos = segment.pos;
        rect.width(10);
        rect.height(10);
        rect.center(pos.x, pos.y);
        rect.stroke({color: '#000'});

        if (!segment.keyframe) {
            originShow.call(tool);
        }
    };

    var originHide = tool.hide;
    tool.hide = function () {
        var pos = segment.pos;
        rect.width(5);
        rect.height(5);
        rect.center(pos.x, pos.y);
        rect.stroke('none');

        if (!segment.keyframe) {
            originHide.call(tool);
        }
    };

    controls.hide();

    tool.unselect();
    tool.hide();

    // plot
    tool.plot = function () {
        var pos = segment.pos;
        var inPos = segment.inControl;
        var outPos = segment.outControl;

        rect.center(pos.x, pos.y);
        inLine.plot(pos.x, pos.y, inPos.x, inPos.y);
        inControl.center(inPos.x, inPos.y);
        outLine.plot(pos.x, pos.y, outPos.x, outPos.y);
        outControl.center(outPos.x, outPos.y);
    };

    // add move callbacks

    var startSegment = null;

    function creatToolCallbacks (type) {
        return {
            start: function () {
                tool.select();

                startSegment = segment.clone();

                if ( callbacks.start )
                    callbacks.start(tool, type);
            },
            update: function ( dx, dy ) {
                var d = v2(dx, dy);
                segment[type] = startSegment[type].add(d);

                if (type === 'pos') {
                    segment.inControl = startSegment.inControl.add(d);
                    segment.outControl = startSegment.outControl.add(d);
                }

                tool.plot();

                if ( callbacks.update ) {
                    callbacks.update(tool, type, dx, dy);
                }
            },
            end: function () {
                if ( callbacks.end )
                    callbacks.end(tool, type);
            }
        };
    }

    _addMoveHandles(rect, creatToolCallbacks('pos'));
    _addMoveHandles(inControl, creatToolCallbacks('inControl'));
    _addMoveHandles(outControl, creatToolCallbacks('outControl'));

    // delete event
    tool.node.tabIndex = -1;

    function deleteCallbak (event) {
        event.stopPropagation();

        if (!segment.keyframe && callbacks.onDelete) {
            callbacks.onDelete(tool);
        }
    }

    var mouseTrap = Mousetrap(tool.node);
    mouseTrap.bind('command+backspace', deleteCallbak);
    mouseTrap.bind('del', deleteCallbak);

    return tool;
}


function CurveTool (svg, path, callbacks) {
    var tool = svg.path(path).fill('none').stroke({color: '#4793e2', width: 5});
    tool.segmentTools = [];

    tool.select = function () {
        if (callbacks.beforeSelected) {
            callbacks.beforeSelected(tool);
        }

        tool.segmentTools.forEach(function (segTool) {
            segTool.show();
        });

        tool.style('stroke-opacity', 1).style('cursor', 'copy');
        tool._selected = true;
    };

    tool.unselect = function () {
        tool.segmentTools.forEach(function (segTool) {
            segTool.unselect();
            segTool.hide();
        });

        tool.style('stroke-opacity', 0).style('cursor', 'default');
        tool._selected = false;
    };

    tool.on('mouseover', function () {
        if (!tool._selected) {
            tool.style('stroke-opacity', 0.5);
        }
    });

    tool.on('mouseout', function () {
        if (!tool._selected) {
            tool.style('stroke-opacity', 0);
        }
    });

    tool.on('mousedown', function (event) {
        event.stopPropagation();

        if (!tool._selected)
            tool.select();
        else {
            if (callbacks.addSegment) {
                callbacks.addSegment(event.offsetX, event.offsetY);
            }
        }
    });

    var originPlot = tool.plot;
    tool.plot = function () {
        var segmentTools = tool.segmentTools;
        var path = '';

        for (var i = 0, l = segmentTools.length; i < l; i++) {
            var seg = segmentTools[i].segment;
            var pos = seg.pos;

            if (i === 0) {
                path = `M ${pos.x} ${pos.y}`;
                continue;
            }

            var preSeg = segmentTools[i - 1].segment;
            var outControl = preSeg.outControl;
            var inControl = seg.inControl;

            path += ` C ${outControl.x} ${outControl.y} ${inControl.x} ${inControl.y} ${pos.x} ${pos.y}`;
        }

        originPlot.call(tool, path);
    };

    tool.unselect();

    return tool;
}

module.exports = {
    SegmentTool: SegmentTool,
    CurveTool: CurveTool
};
