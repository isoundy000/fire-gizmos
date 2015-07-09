(function () {
    Editor.GizmosUtils = require('./gizmos/utils');

    Editor.gizmos = {};
    Editor.gizmos.move = require('./gizmos/move-gizmo');
    Editor.gizmos.rotate = require('./gizmos/rotate-gizmo');
    Editor.gizmos.scale = require('./gizmos/scale-gizmo');
})();
