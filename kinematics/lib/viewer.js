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
const THREE = require("three");
const vscode = require("vscode");
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
function extendRadians(rad) {
    if (!rad.includes('radians')) {
        return rad;
    }
    return rad.replace(/^\${radians\(/g, '').replace(/\)\}/g, '');
}
// how to use these meshfiles? Make a list? Can I at least visualize the first one?
// also need to get the origin; there are 2 origins - visual / collision and joint - which one to use?
class TreeShapeListener {
    constructor(model, macros, document, client) {
        this.linkMap = new Map();
        this.macroCallMap = new Map();
        this.model = model;
        this.client = client;
        this.document = document;
        this.macros = macros;
    }
    enterRuleMacroCall(ctx) {
        var _a, _b;
        // get macro names
        var sym = ctx.getChild(3).text.replace(/"/g, '');
        var offset = this.document.getText().search(sym);
        const position = this.document.positionAt(offset);
        let name = sym.split('.').at(-1);
        // extract parameters
        let ruleParameter = ctx.ruleParameterCall();
        let paramMap = new Map();
        for (let index = 0; index < ruleParameter.length; index++) {
            let name = (_a = ruleParameter.at(index)) === null || _a === void 0 ? void 0 : _a.getChild(3).text.replace(/"/g, '');
            let param = (_b = ruleParameter.at(index)) === null || _b === void 0 ? void 0 : _b.getChild(5).text;
            paramMap.set(name, param);
        }
        this.macroCallMap.set(name, [position, paramMap]);
    }
    enterRuleMacro(ctx) {
        this.macros.set(ctx.getChild(3).text, new urdf_1.UrdfModel());
    }
    enterRuleJoint(ctx) {
        var _a;
        let joint = new urdf_1.UrdfJoint();
        let originRule = ctx.ruleParameterPose();
        if ((originRule === null || originRule === void 0 ? void 0 : originRule.rulePose()) !== undefined) {
            let rpy = ctx.getChild(11).getChild(0).getChild(3).text.replace(/"/g, '').split(' ');
            let xyz = ctx.getChild(11).getChild(0).getChild(5).text.replace(/"/g, '').split(' ');
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
        }
        else {
            // it is a parameter
            joint.origin = originRule === null || originRule === void 0 ? void 0 : originRule.getChild(0).text.replace(/"/g, '');
        }
        joint.name = ctx.getChild(3).text.replace(/"/g, '');
        joint.type = ctx.getChild(5).text;
        let child_link = ctx.getChild(9).text.replace(/"/g, '');
        let child = this.linkMap.get(child_link);
        if (child !== undefined) {
            joint.child = child;
        }
        else {
            // it is a parameter
            joint.child = child_link;
        }
        let parent_link = ctx.getChild(7).text.replace(/"/g, '');
        let parent = this.linkMap.get(parent_link);
        if (parent !== undefined) {
            joint.parent = parent;
        }
        else {
            // it is a parameter
            joint.parent = parent_link;
        }
        let macroRule = (_a = ctx.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (macroRule instanceof DebugInternalKinematicsParser_1.RuleMacroContext) {
            let macro = this.macros.get(macroRule.getChild(3).text);
            macro === null || macro === void 0 ? void 0 : macro.add_joint(joint);
        }
        else {
            // assuming this is <robot>
            this.model.add_joint(joint);
        }
    }
    // links may not have geometries. So it is necessary
    // to parse them independently
    enterRuleLink(ctx) {
        var _a;
        let name = ctx.getChild(3).text.replace(/"/g, '');
        let link = new urdf_1.UrdfLink(name);
        this.linkMap.set(link.name, link);
        let macroRule = (_a = ctx.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (macroRule instanceof DebugInternalKinematicsParser_1.RuleMacroContext) {
            let macro = this.macros.get(macroRule.getChild(3).text);
            macro === null || macro === void 0 ? void 0 : macro.add_link(link);
        }
        else {
            // assuming this is <robot>
            this.model.add_link(link);
        }
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
    getAllMacroDefinitions() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [name, macro] of this.macroCallMap) {
                yield this.getMacroDefinition(name, macro.at(0));
            }
            return new Promise((resolve) => {
                resolve(0);
            });
        });
    }
    getMacroDefinition(name, position) {
        return __awaiter(this, void 0, void 0, function* () {
            var resp = yield this.client.sendRequest(vscode_languageserver_protocol_1.DefinitionRequest.type, this.client.code2ProtocolConverter.asTextDocumentPositionParams(this.document, position))
                .then(this.client.protocol2CodeConverter.asDefinitionResult, (error) => {
                return this.client.handleFailedRequest(vscode_languageserver_protocol_1.DefinitionRequest.type, error, null);
            });
            let location = JSON.parse(JSON.stringify(resp));
            var setting = vscode.Uri.parse(location[0].uri.path);
            let refDocument = yield vscode.workspace.openTextDocument(setting);
            let [model, macros] = yield getModel(refDocument, this.client);
            console.log(model);
            // TODO: loop through joints and links in model
            // check if any element is parameterized
            // replace the parameters with appropriate elem from macros
            // add macros[macroCall name] to this.macros
            // retain only the macro which has been called
            if (!this.macros.has(name)) {
                let r = macros;
                this.macros.set(name, r.get(name));
            }
            return new Promise((resolve) => {
                resolve(0);
            });
        });
    }
}
function getModel(document, client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Initializing model");
        // Create the lexer and parser
        let inputStream = antlr4ts.CharStreams.fromString(document.getText());
        let lexer = new DebugInternalKinematicsLexer_1.DebugInternalKinematicsLexer(inputStream);
        let tokenStream = new antlr4ts.CommonTokenStream(lexer);
        let parser = new DebugInternalKinematicsParser_1.DebugInternalKinematicsParser(tokenStream);
        parser.buildParseTree = true;
        let tree = parser.ruleRobot();
        // model should contain the body within <robot>;
        // also connect links from macro calls
        // for the top-level document, model contains the complete tree
        var model = new urdf_1.UrdfModel();
        // robots (need a better term) contains the macro definitions within the document
        var macros = new Map();
        let listener = new TreeShapeListener(model, macros, document, client);
        ParseTreeWalker_1.ParseTreeWalker.DEFAULT.walk(listener, tree);
        yield listener.getAllMacroDefinitions();
        return [model, macros];
    });
}
exports.getModel = getModel;
//# sourceMappingURL=viewer.js.map