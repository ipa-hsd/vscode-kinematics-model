import { Pose } from "roslib";

export class UrdfModel {
    // materials = ;
    public links: Array<UrdfLink> = [];
    public joints: Array<UrdfJoint> = [];

    public add_link(link: UrdfLink) {
        this.links.push(link);
    }

    public add_joint(joint: UrdfJoint) {
        this.joints.push(joint);
    }
}

export class UrdfJoint {
    public name: String = '';
    public type: String = ''
    public parent?: String | UrdfLink;
    public child?: String | UrdfLink;
    public origin!: String | Pose;
}

export class UrdfLink {
    public name: String = '';
    public visual!: UrdfVisual;

    constructor(name: String) {
        this.name = name;
    }
}

export class UrdfVisual {
    public geometry: any;
    public origin!: Pose;
}

export class UrdfMesh {
    public scale: Number = 1.0;
    public filename: String = '';
}