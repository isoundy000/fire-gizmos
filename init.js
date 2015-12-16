(function () {
    Editor.GizmosUtils = require('./gizmos/utils');

    Editor.gizmos = {};
    Editor.gizmos.move = require('./gizmos/move-gizmo');
    Editor.gizmos.rotate = require('./gizmos/rotate-gizmo');
    Editor.gizmos.scale = require('./gizmos/scale-gizmo');
    Editor.gizmos.rect = require('./gizmos/rect-gizmo');

    Editor.gizmos.trajectory = require('./gizmos/trajectory/trajectory-gizmo');
    Editor.gizmos['cc.Node'] = require('./gizmos/node-gizmo');
})();
