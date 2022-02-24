/*
 * generated by Xtext 2.25.0
 */
grammar DebugInternalKinematics;

// Rule Robot
ruleRobot:
	'Robot'
	'{'
	'name'
	RULE_ID
	(
		'version'
		RULE_STRING
	)?
	(
		'macro'
		'{'
		ruleMacro
		(
			','
			ruleMacro
		)*
		'}'
	)?
	(
		'macroCall'
		'{'
		ruleMacroCall
		(
			','
			ruleMacroCall
		)*
		'}'
	)?
	(
		'body'
		ruleBody
	)?
	'}'
;

// Rule Macro
ruleMacro:
	'Macro'
	'{'
	'name'
	RULE_ID
	(
		'parameter'
		'{'
		ruleParameter
		(
			','
			ruleParameter
		)*
		'}'
	)?
	(
		'body'
		ruleBody
	)?
	'}'
;

// Rule Parameter
ruleParameter:
	'Parameter'
	RULE_ID
	'{'
	'type'
	ruleParameterType
	(
		'value'
		ruleParameterValue
	)?
	'}'
;

// Rule ParameterValue
ruleParameterValue:
	(
		RULE_ID
		    |
		rulePose
		    |
		ruleLinkRef
	)
;

// Rule LinkRef
ruleLinkRef:
	RULE_STRING
;

// Rule ParameterString
ruleParameterString:
	RULE_STRING
	?
	RULE_ID
	?
;

// Rule ParameterPose
ruleParameterPose:
	(
		RULE_STRING
		    |
		rulePose
	)
;

// Rule ParameterLink
ruleParameterLink:
	(
		RULE_ID
		    |
		RULE_STRING
	)
;

// Rule ParameterType
ruleParameterType:
	(
		ruleParameterStringType
		    |
		ruleParameterLinkRefType
		    |
		ruleParameterPoseType
	)
;

// Rule ParameterStringType
ruleParameterStringType:
	'String'
;

// Rule ParameterLinkRefType
ruleParameterLinkRefType:
	'LinkRef'
;

// Rule ParameterPoseType
ruleParameterPoseType:
	'Pose'
;

// Rule Body
ruleBody:
	'Body'
	'{'
	(
		'link'
		'{'
		ruleLink
		(
			','
			ruleLink
		)*
		'}'
	)?
	(
		'joint'
		'{'
		ruleJoint
		(
			','
			ruleJoint
		)*
		'}'
	)?
	'}'
;

// Rule MacroCall
ruleMacroCall:
	'MacroCall'
	'{'
	'macro'
	RULE_STRING
	(
		'parameter'
		'{'
		ruleParameterCall
		(
			','
			ruleParameterCall
		)*
		'}'
	)?
	'}'
;

// Rule ParameterCall
ruleParameterCall:
	'ParameterCall'
	'{'
	'parameter'
	RULE_STRING
	'value'
	ruleParameterValue
	'}'
;

// Rule Joint
ruleJoint:
	'Joint'
	'{'
	'name'
	ruleParameterString
	'type'
	RULE_JOINTTYPE
	'parent'
	ruleParameterLink
	'child'
	ruleParameterLink
	(
		'origin'
		ruleParameterPose
	)?
	(
		'axis'
		ruleVector3
	)?
	(
		'limit'
		ruleLimit
	)?
	'}'
;

// Rule Link
ruleLink:
	'Link'
	'{'
	'name'
	ruleParameterString
	(
		'inertial'
		ruleInertial
	)?
	(
		'visual'
		ruleVisual
	)?
	(
		'collision'
		ruleCollision
	)?
	'}'
;

// Rule Pose
rulePose:
	'Pose'
	'{'
	(
		'rpy'
		RULE_STRING
	)?
	(
		'xyz'
		RULE_STRING
	)?
	'}'
;

// Rule Vector3
ruleVector3:
	'Vector3'
	'{'
	(
		'xyz'
		RULE_STRING
	)?
	'}'
;

// Rule Limit
ruleLimit:
	'Limit'
	'{'
	(
		'effort'
		RULE_STRING
	)?
	(
		'lower'
		RULE_STRING
	)?
	(
		'upper'
		RULE_STRING
	)?
	(
		'velocity'
		RULE_STRING
	)?
	'}'
;

// Rule Inertial
ruleInertial:
	'Inertial'
	'{'
	(
		'origin'
		rulePose
	)?
	(
		'mass'
		ruleMass
	)?
	(
		'inertia'
		ruleInertia
	)?
	'}'
;

// Rule Visual
ruleVisual:
	'Visual'
	'{'
	(
		'origin'
		rulePose
	)?
	'geometry'
	ruleGeometry
	'}'
;

// Rule Collision
ruleCollision:
	'Collision'
	'{'
	(
		'origin'
		rulePose
	)?
	'geometry'
	ruleGeometry
	'}'
;

// Rule Mass
ruleMass:
	'Mass'
	'{'
	(
		'value'
		ruleDouble0
	)?
	'}'
;

// Rule Inertia
ruleInertia:
	'Inertia'
	'{'
	(
		'ixx'
		ruleDouble0
	)?
	(
		'ixy'
		ruleDouble0
	)?
	(
		'ixz'
		ruleDouble0
	)?
	(
		'iyy'
		ruleDouble0
	)?
	(
		'iyz'
		ruleDouble0
	)?
	(
		'izz'
		ruleDouble0
	)?
	'}'
;

// Rule Geometry
ruleGeometry:
	'Geometry'
	'{'
	(
		'box'
		ruleBox
	)?
	(
		'cylinder'
		ruleCylinder
	)?
	(
		'sphere'
		ruleSphere
	)?
	(
		'mesh'
		ruleMesh
	)?
	'}'
;

// Rule Box
ruleBox:
	'Box'
	'{'
	(
		'size'
		ruleParameterString
	)?
	'}'
;

// Rule Cylinder
ruleCylinder:
	'Cylinder'
	'{'
	'length'
	ruleDouble0
	'radius'
	ruleDouble0
	'}'
;

// Rule Sphere
ruleSphere:
	'Sphere'
	'{'
	'radius'
	ruleDouble0
	'}'
;

// Rule Mesh
ruleMesh:
	'Mesh'
	'{'
	'filename'
	RULE_STRING
	(
		'scale'
		ruleDouble0
	)?
	'}'
;

// Rule Double0
ruleDouble0:
	RULE_DOUBLE
;

fragment RULE_DIGIT : '0'..'9';

RULE_BOOLEAN : ('true'|'false');

RULE_DOUBLE : RULE_DECINT ('.' RULE_DIGIT*|('.' RULE_DIGIT*)? ('E'|'e') ('-'|'+')? RULE_DECINT);

RULE_DECINT : ('0'|'1'..'9' RULE_DIGIT*|'-' '0'..'9' RULE_DIGIT*);

RULE_JOINTTYPE : ('revolute'|'continuous'|'prismatic'|'fixed'|'floating'|'planar');

RULE_ID : '^'? ('a'..'z'|'A'..'Z'|'_') ('a'..'z'|'A'..'Z'|'_'|'0'..'9')*;

RULE_INT : ('0'..'9')+;

RULE_STRING : ('"' ('\\' .|~('\\'|'"'))* '"'|'\'' ('\\' .|~('\\'|'\''))* '\'');

RULE_ML_COMMENT : '/*' ( options {greedy=false;} : . )*'*/' {skip();};

RULE_SL_COMMENT : '//' ~('\n'|'\r')* ('\r'? '\n')? {skip();};

RULE_WS : (' '|'\t'|'\r'|'\n')+ {skip();};

RULE_ANY_OTHER : .;
