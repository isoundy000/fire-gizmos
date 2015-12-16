'use strict';

var SegmentTool = require('./trajectory-tool').SegmentTool;
var CurveTool = require('./trajectory-tool').CurveTool;

var Utils = require('./utils');
var Segment = Utils.Segment;

var sampleMotionPaths = Editor.require('app://engine/cocos2d/animation/motion-path-helper').sampleMotionPaths;
var v2 = cc.v2;

var EPSILON = 1e-6;

function close (a, b) {
    return Math.abs(a - b) < EPSILON;
}

function TrajectoryGizmo ( gizmosView, node ) {
    this._node = node;
    this._gizmosView = gizmosView;

    this._hidden = true;

    // tool group
    this._selectTool = this._gizmosView.scene.group();
    this._sampledCurveGroup = this._selectTool.group();
    this._curveGroup = this._selectTool.group();
    this._segmentGroup = this._selectTool.group();

    // selected tool
    this._selectedSegTool = null;
    this._selectedCurveTool = null;

    // help members
    this._animationState = null;
    this._sampledCurve = null;
    this._clip = null;
    this._childPath = '';

    this._lastMapping = null;

    this._segments = [];

    this._processing = false;

    this._savingClip = false;

    // node events
    // TODO
    // node.on('position-changed', this._onNodePositionChanged.bind(this));

    // ipc events
    var Ipc = require('ipc');
    Ipc.on('asset-db:asset-changed', this._onAssetChanged.bind(this));
}

// public functions

TrajectoryGizmo.prototype.show = function (root, clip, childPath) {
    this._selectTool.show();

    var animation = root.getComponent(cc.AnimationComponent);
    this._animationState = animation.getAnimationState(clip.name);
    this._clip = clip;
    this._childPath = childPath;

    this._initSampledCurve();
    this._initSegments();

    this._hidden = false;
};

TrajectoryGizmo.prototype.hide = function () {
    this._selectTool.hide();

    this._hidden = true;
};

TrajectoryGizmo.prototype.remove = function () {
    if ( this._selectTool ) {
        this._selectTool.remove();
    }
};


TrajectoryGizmo.prototype._gizmosViewDirty = function () {
    var scene = cc.director.getScene();
    var mapping = this._gizmosView.worldToPixel(scene.worldPosition);
    var dirty = false;

    if (!this._lastMapping ||
        !close(this._lastMapping.x, mapping.x) ||
        !close(this._lastMapping.y, mapping.y)) {
        dirty = true;
    }

    this._lastMapping = mapping;
    return dirty;
};


TrajectoryGizmo.prototype.update = function () {
    if (this._hidden) return;

    // check whether gizmo view transform is dirty
    if (this._gizmosViewDirty()) {
        this._updateSegments();
        this._drawSampledCurve();
    }

    var aniState = this._animationState;
    if ((aniState.isPlaying && !aniState.isPaused)) {
        aniState.originTime = aniState.time;
    }

    if (!aniState.isPlaying) {
        aniState.originTime = aniState.duration;
    }

    this._time = aniState.originTime || aniState.time;
};

// helper

TrajectoryGizmo.prototype._pixelVecToArray = function (v) {
    var gizmosView = this._gizmosView;
    var parent = this._node.parent;

    var pos = parent.convertToNodeSpace( gizmosView.pixelToWorld(v) );
    return [pos.x, pos.y];
};

TrajectoryGizmo.prototype._segToArray = function (seg) {
    var pos = this._pixelVecToArray(seg.pos);
    var inControl = this._pixelVecToArray(seg.inControl);
    var outControl = this._pixelVecToArray(seg.outControl);

    return pos.concat(inControl).concat(outControl);
};

// segments handler

TrajectoryGizmo.prototype._initSegments = function () {
    var clip = this._clip;
    var keyframes = clip.addProperty('position', '', this._childPath);
    var segments = [];

    // for each keyframes
    for (var i = 0, l = keyframes.length; i < l; i++) {

        var keyframe = keyframes[i];

        var segment = new Segment();
        segment.originValue = keyframe.value;
        segment.keyframe = keyframe;
        segments.push( segment );

        var motionPath = keyframe.motionPath || [];

        for (var j = 0; j < motionPath.length; j++) {
            var value = motionPath[j];
            var subSeg = new Segment();
            subSeg.originValue = value;

            segments.push( subSeg );
        }
    }

    this._segments = segments;

    this.initCurveTools();
    this._updateSegments();
    this._drawSampledCurve();
};

TrajectoryGizmo.prototype._updateSegments = function () {
    var parent = this._node.parent;
    var gizmosView = this._gizmosView;

    function valueToV2 (v1, v2) {
        var v = cc.v2(v1, v2);
        v = parent.convertToWorldSpace(v);
        return gizmosView.worldToPixel(v);
    }

    var segments = this._segments;

    for (var i = 0, l = segments.length; i < l; i++) {
        var seg = segments[i];
        var value = seg.originValue;

        if (value.length === 2) {
            seg.pos = valueToV2(value[0], value[1]);
            seg.inControl = seg.pos.clone();
            seg.outControl = seg.pos.clone();
        }
        else if (value.length === 6) {
            seg.pos = valueToV2(value[0], value[1]);
            seg.inControl = valueToV2(value[2], value[3]);
            seg.outControl = valueToV2(value[4], value[5]);
        }

        seg.tool.plot();
        if (seg.keyframe) {
            seg.tool.curveTools[0].plot();
        }
    }
};

TrajectoryGizmo.prototype._createSegmentTool = function (seg) {
    var segmentGroup = this._segmentGroup;
    var self = this;

    var updated = false;

    var segmentToolCallbacks = {
        beforeSelected: function (segTool) {
            Editor.sendToWindows('trajectory-gizmo:start-operation');

            if (segTool.curveTools.indexOf(self._selectedCurveTool) === -1) {
                segTool.curveTools[0].select();
            }

            if (self._selectedSegTool) {
                self._selectedSegTool.unselect();
            }

            self._selectedSegTool = segTool;
        },

        onDelete: function (segTool) {
            self._removeSegment(segTool);
        },

        start: function () {
            self._processing = true;
            self._initSampledCurve();

            updated = false;
        },

        update: function (segTool) {
            updated = true;

            segTool.curveTools.forEach(function (curveTool) {
                curveTool.plot();
            });

            self._updateSampledCurves();
            self._drawSampledCurve();
            self._animationState.sample();
            cc.engine.repaintInEditMode();

        },

        end: function () {
            self._processing = false;

            if (updated) {
                self._saveClip();
            }

            Editor.sendToWindows('trajectory-gizmo:end-operation');
        }
    };

    var tool = new SegmentTool(segmentGroup, seg, segmentToolCallbacks);
    seg.tool = tool;
    return tool;
};

TrajectoryGizmo.prototype.initCurveTools = function () {
    var segments = this._segments;
    var curveGroup = this._curveGroup;
    var segmentGroup = this._segmentGroup;

    curveGroup.clear();
    segmentGroup.clear();

    var self = this;
    var curveCallbacks = {
        beforeSelected: function (curveTool) {
            if (self._selectedCurveTool) {
                self._selectedCurveTool.unselect();
            }

            self._selectedCurveTool = curveTool;
        },

        addSegment: function (x, y) {
            var pos = v2(x, y);
            self._addSegment(pos);
        }
    };

    var curveTool = CurveTool(curveGroup, '', curveCallbacks);

    for (var i = 0, l = segments.length; i < l; i++) {
        var seg = segments[i];
        var segTool = this._createSegmentTool(seg);

        segTool.curveTools.push(curveTool);
        curveTool.segmentTools.push(segTool);

        if (i > 0 && seg.keyframe) {
            curveTool.plot();

            if (i < l - 1) {
                curveTool = CurveTool(curveGroup, '', curveCallbacks);
                curveTool.segmentTools.push(segTool);
                segTool.curveTools.push(curveTool);
            }
        }
    }
};

TrajectoryGizmo.prototype._addSegment = function (pos) {
    var curveTool = this._selectedCurveTool;

    if (!curveTool) return;

    var segmentTools = curveTool.segmentTools;
    var minResult;
    var segTool;

    for (var i = 0, l = segmentTools.length - 1; i < l; i++) {
        segTool = segmentTools[i];
        var nextSegTool = segmentTools[i + 1];

        var result = Utils.getNearestParameter(segTool.segment, nextSegTool.segment, pos);

        if (!minResult || result.dist < minResult.dist) {
            minResult = result;
            minResult.seg1 = segTool;
            minResult.seg2 = nextSegTool;
        }
    }

    var seg = Utils.createSegmentWithNearset(minResult);
    seg.originValue = this._segToArray(seg);

    // add segment
    var segments = this._segments;
    var segIndex = segments.indexOf(minResult.seg2.segment);
    segments.splice(segIndex, 0, seg);

    // add segment tool
    segTool = this._createSegmentTool(seg);
    var segToolIndex = curveTool.segmentTools.indexOf(minResult.seg2);
    curveTool.segmentTools.splice(segToolIndex, 0, segTool);
    segTool.curveTools.push(curveTool);

    segTool.show();
    segTool.select();
    curveTool.plot();

    // update sampled curve
    this._updateSampledCurves();
    this._drawSampledCurve();

    this._saveClip();
};

TrajectoryGizmo.prototype._addKeySegment = function (position, time, keyframes) {
    var i, l;

    if (keyframes.length === 0 ||
        time < keyframes[0].frame) {
        i = 0;
    }
    else {
        for (i = 0, l = keyframes.length; i < l; i++) {
            if (keyframes[i].frame > time) {
                break;
            }
        }
    }

    var keyframe = {
        frame: time,
        value: [position.x, position.y],
        motionPath: []
    };

    keyframes.splice(i, 0, keyframe);

    return i;
};

TrajectoryGizmo.prototype._removeSegment = function (segTool) {
    var segments = this._segments;
    var segment = segTool.segment;
    var curveTool = segTool.curveTools[0];
    var segTools = curveTool.segmentTools;

    segTool.hide();

    segments.splice(segments.indexOf(segment), 1);
    segTools.splice(segTools.indexOf(segTool), 1);

    curveTool.plot();

    // update sampled curve
    this._updateSampledCurves();
    this._drawSampledCurve();

    this._saveClip();

    if (this._selectedSegTool === segTool) {
        this._selectedSegTool = null;
    }
};

TrajectoryGizmo.prototype._saveClip = function () {
    var clip = this._clip;

    this._savingClip = true;
    Editor.assetdb.queryUrlByUuid(clip._uuid, function (url) {
        Editor.sendToCore('asset-db:save', url, clip.serialize());
    });
};

TrajectoryGizmo.prototype._initSampledCurve = function () {
    var aniState = this._animationState;
    var curves = aniState.curves;
    var sampledCurve;

    for (var i = 0, l = curves.length; i < l; i++) {
        var curve = curves[i];
        if (curve.target === this._node && curve.prop === 'position') {
            sampledCurve = curve;
            break;
        }
    }

    this._sampledCurve = sampledCurve;
};

TrajectoryGizmo.prototype._updateSampledCurves = function () {
    var segments = this._segments;
    var keyframes = [];
    var keyframe;

    var clip = this._clip;
    var sampledCurve = this._sampledCurve;

    if (!sampledCurve) return;
    var i, l;

    for (i = 0, l = segments.length; i < l; i++) {
        var seg = segments[i];

        if (seg.keyframe) {
            keyframe = seg.keyframe;
            seg.originValue = keyframe.value = this._pixelVecToArray(seg.pos);
            keyframe.motionPath = [];
            keyframes.push(keyframe);
            continue;
        }

        var value = seg.originValue = this._segToArray(seg);
        keyframe.motionPath.push(value);
    }

    var motionPaths = [];

    sampledCurve.ratios = [];
    sampledCurve.types = [];
    sampledCurve.values = [];

    for (i = 0, l = keyframes.length; i < l; i++) {
        keyframe = keyframes[i];

        var ratio = keyframe.frame / clip.duration;
        sampledCurve.ratios.push(ratio);

        sampledCurve.values.push(keyframe.value);
        sampledCurve.types.push(keyframe.curve);

        if (keyframe.motionPath && keyframe.motionPath.length > 0)
            motionPaths.push(keyframe.motionPath);
        else
            motionPaths.push(null);
    }

    sampleMotionPaths(motionPaths, sampledCurve, clip.duration, clip.sample);
};

TrajectoryGizmo.prototype._drawSampledCurve = function () {
    var group = this._sampledCurveGroup;
    if (!group.circles) group.circles = [];

    var circles = group.circles;

    var sampledCurve = this._sampledCurve;
    if (!sampledCurve) {
        circles.forEach(function (circle) {
            circle.hide();
        });
        return;
    }

    var parent = this._node.parent;
    var gizmosView = this._gizmosView;
    var values = sampledCurve.values;

    var destLength = values.length;
    var srcLength = circles.length;

    var i, l;
    for (i = 0, l = destLength; i < l; i++) {
        var value = values[i];
        value = parent.convertToWorldSpace(value);
        // 这里不能snap, 否则点比较密集时会出现浮动
        value = gizmosView.worldToPixel(value);

        var circle = circles[i];

        if (!circle) {
            circle = circles[i] = group.circle(1).stroke({color: '#4793e2'});
        }

        circle.show();
        circle.center(value.x, value.y);
    }

    for (i = destLength, l = srcLength; i < l; i++) {
        circles[i].hide();
    }
};





// event handler

TrajectoryGizmo.prototype._onNodePositionChanged = function (event) {

    if (TrajectoryGizmo.animationChanged || this._processing) {
        return;
    }

    var node = this._node;
    var position = node.position;
    var lastPosition = event.detail;

    var difx = position.x - lastPosition.x;
    var dify = position.y - lastPosition.y;

    if (Math.abs(difx) < 0.01 && Math.abs(dify) < 0.01) {
        return;
    }

    var segments = this._segments;
    var gizmosView = this._gizmosView;
    var clip = this._clip;
    var keyframes = clip.addProperty('position', '', this._childPath);

    var segment;

    if (TrajectoryGizmo.state === 'segment') {
        var time = this._time;

        var keyframe = keyframes.find(function (item) {
            return close(item.frame, time);
        });

        // if no keyframe, then create a new keyframe
        if (!keyframe) {

            var index = this._addKeySegment(position, time, keyframes);
            keyframe = keyframes[index];

            this._initSegments();
        }
        else {
            segment = segments.find(function (item) {
                return item.keyframe === keyframe;
            });

            var pos = this._gizmosView.worldToPixel(node.worldPosition);
            segment.pos = pos.clone();
            segment.inControl = pos.clone();
            segment.outControl = pos.clone();

            var segTool = segment.tool;
            segTool.plot();
            segTool.curveTools.forEach(function (curveTool) {
                curveTool.plot();
            });

            this._updateSampledCurves();
            this._drawSampledCurve();
        }
    }
    else if (TrajectoryGizmo.state === 'trajectory') {
        var parent = node.parent;

        position = gizmosView.worldToPixel( parent.convertToWorldSpace(position) );
        lastPosition = gizmosView.worldToPixel( parent.convertToWorldSpace(lastPosition) );

        var dif = position.sub(lastPosition);

        for (var i = 0, l = segments.length; i < l; i++) {
            segment = segments[i];
            segment.pos.addSelf(dif);
            segment.inControl.addSelf(dif);
            segment.outControl.addSelf(dif);

            segment.tool.plot();
            segment.tool.curveTools[0].plot();
        }

        this._updateSampledCurves();
        this._drawSampledCurve();
    }

    Editor.sendToWindows('trajectory-gizmo:update-position-keyframes', {
        childPath: this._childPath,
        data: JSON.stringify(keyframes, null, 2)
    });
};

TrajectoryGizmo.prototype._onAssetChanged = function (result) {
    var clip = this._clip;
    if (!clip || clip._uuid !== result.uuid) return;

    if (this._savingClip) {
        this._savingClip = false;
        return;
    }

    var self = this;

    cc.AssetLibrary.loadAsset(result.uuid, function (err, clip) {
        self._clip = clip;

        self._initSampledCurve();
        self._initSegments();
    });
};

TrajectoryGizmo.animationChanged = false;
TrajectoryGizmo.state = 'segment'; // 'segment', 'trajectory'

module.exports = TrajectoryGizmo;
