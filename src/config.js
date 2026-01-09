
var offset = {
	browDownLeft: 0,
	browDownRight: 0,
	browInnerUp: 0,
	browOuterUpLeft: 0,
	browOuterUpRight: 0,
	cheekPuff: 0,
	cheekSquintLeft: 0,
	cheekSquintRight: 0,
	eyeBlinkLeft: 0,
	eyeBlinkRight: 0,
	eyeLookDownLeft: 0,
	eyeLookDownRight: 0,
	eyeLookInLeft: 0,
	eyeLookInRight: 0,
	eyeLookOutLeft: 0,
	eyeLookOutRight: 0,
	eyeLookUpLeft: 0,
	eyeLookUpRight: 0,
	eyeSquintLeft: 0,
	eyeSquintRight: 0,
	eyeWideLeft: 0,
	eyeWideRight: 0,
	jawForward: 0,
	jawLeft: 0,
	jawOpen: 0,
	jawRight: 0,
	mouthClose: 0,
	mouthDimpleLeft: 0,
	mouthDimpleRight: 0,
	mouthFrownLeft: 0,
	mouthFrownRight: 0,
	mouthFunnel: 0,
	mouthLeft: 0,
	mouthLowerDownLeft: 0,
	mouthLowerDownRight: 0,
	mouthPressLeft: 0,
	mouthPressRight: 0,
	mouthPucker: 0,
	mouthRight: 0,
	mouthRollLower: 0,
	mouthRollUpper: 0,
	mouthShrugLower: 0,
	mouthShrugUpper: 0,
	mouthSmileLeft: 0,
	mouthSmileRight: 0,
	mouthStretchLeft: 0,
	mouthStretchRight: 0,
	mouthUpperUpLeft: 0,
	mouthUpperUpRight: 0,
	noseSneerLeft: 0,
	noseSneerRight: 0,
	tongueOut: 0
};
var scale$1 = {
	browDownLeft: 1,
	browDownRight: 1,
	browInnerUp: 1,
	browOuterUpLeft: 1,
	browOuterUpRight: 1,
	cheekPuff: 1,
	cheekSquintLeft: 1,
	cheekSquintRight: 1,
	eyeBlinkLeft: 1,
	eyeBlinkRight: 1,
	eyeLookDownLeft: 1,
	eyeLookDownRight: 1,
	eyeLookInLeft: 1,
	eyeLookInRight: 1,
	eyeLookOutLeft: 1,
	eyeLookOutRight: 1,
	eyeLookUpLeft: 1,
	eyeLookUpRight: 1,
	eyeSquintLeft: 1,
	eyeSquintRight: 1,
	eyeWideLeft: 1,
	eyeWideRight: 1,
	jawForward: 1,
	jawLeft: 1,
	jawOpen: 1.2,
	jawRight: 1,
	mouthClose: 0.2,
	mouthDimpleLeft: 1.3,
	mouthDimpleRight: 1.3,
	mouthFrownLeft: 1.3,
	mouthFrownRight: 1.3,
	mouthFunnel: 1.3,
	mouthLeft: 1.3,
	mouthLowerDownLeft: 0.7,
	mouthLowerDownRight: 0.7,
	mouthPressLeft: 1.3,
	mouthPressRight: 1.3,
	mouthPucker: 1,
	mouthRight: 1.3,
	mouthRollLower: 1.3,
	mouthRollUpper: 1.3,
	mouthShrugLower: 1.3,
	mouthShrugUpper: 0.1,
	mouthSmileLeft: 1,
	mouthSmileRight: 1,
	mouthStretchLeft: 1.3,
	mouthStretchRight: 1.3,
	mouthUpperUpLeft: 1.3,
	mouthUpperUpRight: 1.3,
	noseSneerLeft: 1,
	noseSneerRight: 1,
	tongueOut: 1
};
export const motionConfig = {
	offset: offset,
	scale: scale$1
};

var hello = {
	size: 2,
	isGroup: false
};
var idle = {
	size: 1,
	isGroup: false
};
var listen = {
	size: 0,
	isGroup: false
};
var speak = {
	size: 6,
	isGroup: false
};
var think = {
	size: 3,
	isGroup: true
};
var other = [
];
export const animationConfig = {
	hello: hello,
	idle: idle,
	listen: listen,
	speak: speak,
	think: think,
	other: other
};


var name = "";
var position = {
	x: 0,
	y: 0,
	z: 0
};
var scale = {
	x: 1,
	y: 1,
	z: 1
};
var camPos = {
	x: 0,
	y: 1.8,
	z: 1
};
var camRot = {
	x: -10,
	y: 0,
	z: 0
};
var backgroundColor = "0xffffff";
var useFlame = "false";

export const charactorConfig = {
	name: name,
	position: position,
	scale: scale,
	camPos: camPos,
	camRot: camRot,
	backgroundColor: backgroundColor,
	useFlame: useFlame
};