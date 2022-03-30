"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrdfMesh = exports.UrdfVisual = exports.UrdfLink = exports.UrdfJoint = exports.UrdfModel = void 0;
class UrdfModel {
    constructor() {
        // materials = ;
        this.links = [];
        this.joints = [];
    }
    add_link(link) {
        this.links.push(link);
    }
    add_joint(joint) {
        this.joints.push(joint);
    }
}
exports.UrdfModel = UrdfModel;
class UrdfJoint {
    constructor() {
        this.name = '';
        this.type = '';
    }
}
exports.UrdfJoint = UrdfJoint;
class UrdfLink {
    constructor(name) {
        this.name = '';
        this.name = name;
    }
}
exports.UrdfLink = UrdfLink;
class UrdfVisual {
}
exports.UrdfVisual = UrdfVisual;
class UrdfMesh {
    constructor() {
        this.scale = 1.0;
        this.filename = '';
    }
}
exports.UrdfMesh = UrdfMesh;
//# sourceMappingURL=urdf.js.map