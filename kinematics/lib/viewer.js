"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModel = void 0;
const antlr4ts = require("antlr4ts");
const ParseTreeWalker_1 = require("antlr4ts/tree/ParseTreeWalker");
// import { RuleNode } from "antlr4ts/tree/RuleNode";
const DebugInternalKinematicsLexer_1 = require("./parser/DebugInternalKinematicsLexer");
const DebugInternalKinematicsParser_1 = require("./parser/DebugInternalKinematicsParser");
const urdf_1 = require("./urdf/urdf");
const roslib_1 = require("roslib");
// import { RuleNode } from 'antlr4ts/tree/RuleNode';
const THREE = require("three");
function extendRadians(rad) {
    if (!rad.includes('radians')) {
        return rad;
    }
    return rad.replace(/^\${radians\(/g, '').replace(/\)\}/g, '');
}
// how to use these meshfiles? Make a list? Can I at least visualize the first one?
// also need to get the origin; there are 2 origins - visual / collision and joint - which one to use?
class TreeShapeListener {
    constructor(model) {
        this.linkMap = new Map();
        this.model = model;
    }
    enterRuleJoint(ctx) {
        let parent_link = ctx.getChild(7).text.replace(/"/g, '');
        let child_link = ctx.getChild(9).text.replace(/"/g, '');
        // for(let i = 0; i < ctx.childCount; i++) {
        //     // console.log(i);
        //     console.log(i + " " + ctx.getChild(i).text);
        // }
        let rpy = ctx.getChild(11).getChild(0).getChild(3).text.replace(/"/g, '').split(' ');
        let xyz = ctx.getChild(11).getChild(0).getChild(5).text.replace(/"/g, '').split(' ');
        // console.log("rpy: " + rpy);
        // console.log("xyz: " + xyz[0] + " " + ctx.getChild(11).getChild(0).getChild(5).text);
        let joint = new urdf_1.UrdfJoint();
        joint.name = ctx.getChild(3).text.replace(/"/g, '');
        joint.type = ctx.getChild(5).text;
        joint.parent = this.linkMap.get(parent_link);
        joint.child = this.linkMap.get(child_link);
        var position = new roslib_1.Vector3({
            x: parseFloat(xyz[0]),
            y: parseFloat(xyz[1]),
            z: parseFloat(xyz[2])
        });
        // convert '$radian{deg}' to radians in float
        let r = parseFloat(extendRadians(rpy[0])) * (Math.PI / 180);
        let p = parseFloat(extendRadians(rpy[1])) * (Math.PI / 180);
        let y = parseFloat(extendRadians(rpy[2])) * (Math.PI / 180);
        var rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(r, p, y, 'XYZ'));
        var orientation = new roslib_1.Quaternion({
            x: rot.x,
            y: rot.y,
            z: rot.z,
            w: rot.w
        });
        var origin = new roslib_1.Pose({
            position: position,
            orientation: orientation
        });
        joint.origin = origin;
        this.model.add_joint(joint);
    }
    // links may not have geometries. So it is necessary
    // to parse them independently
    enterRuleLink(ctx) {
        let name = ctx.getChild(3).text.replace(/"/g, '');
        let link = new urdf_1.UrdfLink(name);
        this.linkMap.set(link.name, link);
        this.model.add_link(link);
    }
    // ideally all geometries (links) should be parsed before the joints
    // since links are referenced in the joints
    enterRuleVisual(ctx) {
        var _a;
        let visual = new urdf_1.UrdfVisual();
        let pose = undefined;
        let xyz = ['0', '0', '0'];
        let rpy = ['0', '0', '0', '1'];
        pose = ctx.rulePose();
        if (pose !== undefined) {
            // rpy = pose.getChild(3).text.split(' ');
            xyz = ctx.getChild(5).text.split(' ');
        }
        var position = new roslib_1.Vector3({
            x: parseFloat(xyz[0]),
            y: parseFloat(xyz[1]),
            z: parseFloat(xyz[2])
        });
        var orientation = new roslib_1.Quaternion({
            x: parseFloat(rpy[0]),
            y: parseFloat(rpy[1]),
            z: parseFloat(rpy[2]),
            w: parseFloat(rpy[3])
        });
        var origin = new roslib_1.Pose({
            position: position,
            orientation: orientation
        });
        visual.origin = origin;
        // get link name to update link obj
        let name = (_a = ctx.parent) === null || _a === void 0 ? void 0 : _a.getChild(3).text.replace(/"/g, '');
        let link = this.linkMap.get(name);
        let geom = ctx.ruleGeometry();
        if (geom !== undefined) {
            let geomType = geom.getChild(3);
            if (geomType instanceof DebugInternalKinematicsParser_1.RuleMeshContext) {
                let uri = geomType.getChild(3).text // id=3 is hardcoded; not a good idea
                    .replace('package://', '')
                    .replace(/"/g, '');
                let mesh = new urdf_1.UrdfMesh();
                mesh.filename = uri;
                visual.geometry = mesh;
                // update link with visual (geometry)
                link.visual = visual;
                Object.assign(this.linkMap, { name: link });
            }
        }
    }
}
function getModel(modelStr) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Initializing model");
        // Create the lexer and parser
        let inputStream = antlr4ts.CharStreams.fromString(modelStr);
        let lexer = new DebugInternalKinematicsLexer_1.DebugInternalKinematicsLexer(inputStream);
        let tokenStream = new antlr4ts.CommonTokenStream(lexer);
        let parser = new DebugInternalKinematicsParser_1.DebugInternalKinematicsParser(tokenStream);
        parser.buildParseTree = true;
        let tree = parser.ruleRobot();
        var model = new urdf_1.UrdfModel();
        ParseTreeWalker_1.ParseTreeWalker.DEFAULT.walk(new TreeShapeListener(model), tree);
        return model;
    });
}
exports.getModel = getModel;
//# sourceMappingURL=viewer.js.map