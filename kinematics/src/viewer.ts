import * as antlr4ts from 'antlr4ts';
import { ParseTreeWalker } from "antlr4ts/tree/ParseTreeWalker";
import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";
// import { RuleNode } from "antlr4ts/tree/RuleNode";

import { DebugInternalKinematicsLexer } from './parser/DebugInternalKinematicsLexer';
import { DebugInternalKinematicsParser, RuleJointContext, RuleLinkContext, RuleMacroCallContext, RuleMeshContext, RuleVisualContext, RuleMacroContext} from './parser/DebugInternalKinematicsParser';
import { DebugInternalKinematicsListener } from './parser/DebugInternalKinematicsListener';

import { UrdfModel, UrdfJoint, UrdfLink, UrdfVisual, UrdfMesh } from './urdf/urdf'
import { Vector3, Quaternion, Pose } from 'roslib';

import * as THREE from 'three';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import * as vscode_languageserver_protocol_1 from 'vscode-languageserver-protocol';


function extendRadians(rad: string) {
    if(!rad.includes('radians')) {
        return rad;
    }
    return rad.replace(/^\${radians\(/g, '').replace(/\)\}/g, '');
}


// how to use these meshfiles? Make a list? Can I at least visualize the first one?
// also need to get the origin; there are 2 origins - visual / collision and joint - which one to use?
class TreeShapeListener implements DebugInternalKinematicsListener {
    private model: UrdfModel;
    private client: LanguageClient;
    private document: vscode.TextDocument;
    private linkMap = new Map<String, UrdfLink>();
    private macros: Map<String, UrdfModel>;
    private macroCallMap = new Map<String, Array<vscode.Position | Map<String, String>>>();

    constructor(model: UrdfModel, macros: Map<String, UrdfModel>, document: vscode.TextDocument, client: LanguageClient) {
        this.model = model;
        this.client = client;
        this.document = document;
        this.macros = macros;
    }

    public enterRuleMacroCall(ctx: RuleMacroCallContext) {
        // get macro names
        var sym = ctx.getChild(3).text.replace(/"/g, '');
        var offset = this.document.getText().search(sym);
        const position = this.document.positionAt(offset);
        let name = sym.split('.').at(-1);

        // extract parameters
        let ruleParameter = ctx.ruleParameterCall();
        let paramMap = new Map<String, String>();
        for (let index = 0; index < ruleParameter.length; index++) {
            let name = ruleParameter.at(index)?.getChild(3).text.replace(/"/g, '');
            let param = ruleParameter.at(index)?.getChild(5).text;
            paramMap.set(name!, param!);
        }

        this.macroCallMap.set(name!, [position, paramMap]);
    }

    public enterRuleMacro(ctx: RuleMacroContext) {
        this.macros.set(ctx.getChild(3).text, new UrdfModel());
    }

    public enterRuleJoint(ctx: RuleJointContext) {
        let joint = new UrdfJoint();

        let originRule = ctx.ruleParameterPose();
        if(originRule?.rulePose() !== undefined) {
            let rpy = ctx.getChild(11).getChild(0).getChild(3).text.replace(/"/g, '').split(' ');
            let xyz = ctx.getChild(11).getChild(0).getChild(5).text.replace(/"/g, '').split(' ');

            var position = new Vector3({
                x : parseFloat(xyz[0]),
                y : parseFloat(xyz[1]),
                z : parseFloat(xyz[2])
            });

            // convert '$radian{deg}' to radians in float
            let r = parseFloat(extendRadians(rpy[0])) * (Math.PI/180);
            let p = parseFloat(extendRadians(rpy[1])) * (Math.PI/180);
            let y = parseFloat(extendRadians(rpy[2])) * (Math.PI/180);

            var rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(r, p, y, 'XYZ'));

            var orientation = new Quaternion({
                x : rot.x,
                y : rot.y,
                z : rot.z,
                w : rot.w
            });

            var origin = new Pose({
                position : position,
                orientation : orientation
            });
            joint.origin = origin;
        } else {
            // it is a parameter
            joint.origin = originRule?.getChild(0).text.replace(/"/g, '')!;
        }

        joint.name = ctx.getChild(3).text.replace(/"/g, '');
        joint.type = ctx.getChild(5).text;

        let child_link = ctx.getChild(9).text.replace(/"/g, '');
        let child = this.linkMap.get(child_link);
        if(child !== undefined) {
            joint.child = child;
        } else {
            // it is a parameter
            joint.child = child_link;
        }

        let parent_link = ctx.getChild(7).text.replace(/"/g, '');
        let parent = this.linkMap.get(parent_link);
        if(parent !== undefined) {
            joint.parent = parent;
        } else {
            // it is a parameter
            joint.parent = parent_link;
        }

        let macroRule = ctx.parent?.parent;
        if(macroRule instanceof RuleMacroContext) {
            let macro = this.macros.get(macroRule.getChild(3).text);
            macro?.add_joint(joint);
        } else {
            // assuming this is <robot>
            this.model.add_joint(joint);
        }
    }

    // links may not have geometries. So it is necessary
    // to parse them independently
    public enterRuleLink(ctx: RuleLinkContext) {
        let name = ctx.getChild(3).text.replace(/"/g, '');
        let link = new UrdfLink(name!);

        this.linkMap.set(link.name, link);
        let macroRule = ctx.parent?.parent;
        if(macroRule instanceof RuleMacroContext) {
            let macro = this.macros.get(macroRule.getChild(3).text);
            macro?.add_link(link);
        } else {
            // assuming this is <robot>
            this.model.add_link(link);
        }
    }

    // ideally all geometries (links) should be parsed before the joints
    // since links are referenced in the joints
    public enterRuleVisual(ctx: RuleVisualContext) {
        let visual = new UrdfVisual();

        let pose = undefined;
        let xyz = ['0', '0', '0'];
        let rpy = ['0', '0', '0', '1'];

        pose = ctx.rulePose();
        if(pose !== undefined) {
            // rpy = pose.getChild(3).text.split(' ');
            xyz = ctx.getChild(5).text.split(' ');
        }

        var position = new Vector3({
            x : parseFloat(xyz[0]),
            y : parseFloat(xyz[1]),
            z : parseFloat(xyz[2])
        });
        var orientation = new Quaternion({
            x : parseFloat(rpy[0]),
            y : parseFloat(rpy[1]),
            z : parseFloat(rpy[2]),
            w : parseFloat(rpy[3])
        });
        var origin = new Pose({
            position : position,
            orientation : orientation
        });
        visual.origin = origin;

        // get link name to update link obj
        let name = ctx.parent?.getChild(3).text.replace(/"/g, '');
        let link = this.linkMap.get(name!);

        let geom = ctx.ruleGeometry();
        if(geom !== undefined) {
            let geomType = geom.getChild(3);

            if (geomType instanceof RuleMeshContext) {
                let uri = geomType.getChild(3).text  // id=3 is hardcoded; not a good idea
                    .replace('package://', '')
                    .replace(/"/g, '');

                let mesh = new UrdfMesh();
                mesh.filename = uri;
                visual.geometry = mesh;

                // update link with visual (geometry)
                link!.visual = visual;
                Object.assign(this.linkMap, {name: link});
            }
        }
    }

    public async getAllMacroDefinitions() {
        for (const [name, macro] of this.macroCallMap) {
            await this.getMacroDefinition(name, macro.at(0) as vscode.Position);
        }
        return new Promise((resolve)=> {
            resolve(0);
        })
    }

    private async getMacroDefinition(name: String, position: vscode.Position) {
        var resp = await this.client.sendRequest(vscode_languageserver_protocol_1.DefinitionRequest.type,
        this.client.code2ProtocolConverter.asTextDocumentPositionParams(this.document, position))
            .then(this.client.protocol2CodeConverter.asDefinitionResult, (error) => {
                return this.client.handleFailedRequest(vscode_languageserver_protocol_1.DefinitionRequest.type, error, null);
        });
        let location = JSON.parse(JSON.stringify(resp));

        var setting = vscode.Uri.parse(location[0].uri.path);
        let refDocument = await vscode.workspace.openTextDocument(setting)

        let [model, macros] = await getModel(refDocument, this.client);

        console.log(model);
        // TODO: loop through joints and links in model
        // check if any element is parameterized
        // replace the parameters with appropriate elem from macros

        // add macros[macroCall name] to this.macros
        // retain only the macro which has been called
        if(!this.macros.has(name!)) {
            let r = macros as Map<String, UrdfModel>;
            this.macros.set(name!, r.get(name)!);
        }

        return new Promise((resolve)=> {
            resolve(0);
        });
    }
}


export async function getModel(document: vscode.TextDocument, client: LanguageClient) {
    console.log("Initializing model")

    // Create the lexer and parser
    let inputStream = antlr4ts.CharStreams.fromString(document.getText());
    let lexer = new DebugInternalKinematicsLexer(inputStream);
    let tokenStream = new antlr4ts.CommonTokenStream(lexer);
    let parser = new DebugInternalKinematicsParser(tokenStream);
    
    parser.buildParseTree = true;
    let tree = parser.ruleRobot();

    // model should contain the body within <robot>;
    // also connect links from macro calls
    // for the top-level document, model contains the complete tree
    var model = new UrdfModel();
    // robots (need a better term) contains the macro definitions within the document
    var macros: Map<String, UrdfModel> = new Map<String, UrdfModel>();

    let listener = new TreeShapeListener(model, macros, document, client);
    ParseTreeWalker.DEFAULT.walk(listener as ParseTreeListener, tree);

    await listener.getAllMacroDefinitions();
    return [model, macros];
}
