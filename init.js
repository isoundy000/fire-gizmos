(function () {
    Editor.GizmosUtils = require('./gizmos/utils');

    Editor.gizmos = {};
    Editor.gizmos.move = require('./gizmos/move-gizmo');
    Editor.gizmos.rotate = require('./gizmos/rotate-gizmo');
    Editor.gizmos.scale = require('./gizmos/scale-gizmo');

    Editor.gizmos['cc.SpriteWrapper'] = require('./gizmos/sprite-gizmo');
    Editor.gizmos['cc.BitmapFontWrapper'] = require('./gizmos/sprite-gizmo');
    Editor.gizmos['cc.ParticleWrapper'] = require('./gizmos/particle-gizmo');
})();
