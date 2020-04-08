var glob = require("glob");
var fs = require('fs');
var THREE = require("three.js");
var matterport = require('./Matterport3D.js');

var camera, camera_pose, scene, controls, renderer, connections, id_to_ix, world_frame, cylinder_frame, cubemap_frame;

var SIZE_X = 1140;
var SIZE_Y = 650;
var VFOV = 80;
var ASPECT = SIZE_X/SIZE_Y;

var instr_path = '../app/instructions/';
var instr_files = glob.sync(instr_path + '/*.json');
// console.log(instr_files);

var save_dir = '../app/new_instructions/';
if (!fs.existsSync(save_dir))
	fs.mkdirSync(save_dir);

var matt = new matterport.Matterport3D("");
for (var path in instr_files) {
	var data = fs.readFileSync(instr_files[path]);
	var instrs = data.toString();
	instrs = JSON.parse(instrs);

    // console.log(instrs.length);
    if (instrs.length > 0) {
    	var scan = instrs[0]['bbox']['scan'];
    	skybox_init();
    	load_connections(scan);
    	correct(instrs);
	}
}

function correct(instrs) {
	new_instrs = [];
	for (var i in instrs) {
    	var ins = instrs[i];
    	var bbox = ins['bbox'];
    	var curr_image_id = bbox['image_id'];
    	move_to(curr_image_id, true);
    	var [center_vec, old_pos] = draw_bboxes(bbox);
    	// save center point and camera matrix
    	bbox['center_3d'] = {'x':center_vec.x, 'y':center_vec.y, 'z':center_vec.z};
    	var cam_max = get_camera_matrix();
    	// bbox['correct_matrix'] = cam_max.elements;
    	cam_vars = cam_max.elements.values();
    	cam_list = []
    	for (let v of cam_vars) {
    		cam_list.push(v);
    	}
    	bbox['correct_matrix'] = cam_list;
    	// console.log(cam_list)
    	ins['bbox'] = bbox;
    	new_instrs.push(ins);
    	// reset camera position
    	camera.position.set(old_pos.x, old_pos.y, old_pos.z);
    }
    var scan = instrs[0]['bbox']['scan'];
    var file_path = save_dir + scan + '_instructions.json';
    var str = JSON.stringify(new_instrs);
	fs.writeFileSync(file_path, str);
}

function draw_bboxes(data)
{
  // console.log(data)
  var cubemap_frame_matrix = new THREE.Matrix4();
  cubemap_frame_matrix.fromArray(data["cubemap_frame_matrix"])
  cubemap_frame_matrix.decompose(cubemap_frame.position, cubemap_frame.quaternion, cubemap_frame.scale);
  cubemap_frame.updateMatrix();
  var world_frame_matrix = new THREE.Matrix4();
  world_frame_matrix.fromArray(data["world_frame_matrix"])
  world_frame_matrix.decompose(world_frame.position, world_frame.quaternion, world_frame.scale);
  world_frame.updateMatrix();
  var camera_pose_matrix = new THREE.Matrix4();
  camera_pose_matrix.fromArray(data["camera_pose_matrix"])
  camera_pose_matrix.decompose(camera_pose.position, camera_pose.quaternion, camera_pose.scale);
  camera_pose.updateMatrix();
  var camera_matrix = new THREE.Matrix4();
  camera_matrix.fromArray(data["camera_matrix"])
  camera_matrix.decompose(camera.position, camera.quaternion, camera.scale);
  camera.updateMatrix();
  var left_top = data.mouse_left_top;
  var right_bottom = data.mouse_right_bottom;
  var right_top = data.mouse_right_top;
  var left_bottom = data.mouse_left_bottom;
  var left_top_vec = new THREE.Vector3();
  left_top_vec.x = left_top.x;
  left_top_vec.y = left_top.y;
  left_top_vec.z = left_top.z;
  var right_bottom_vec = new THREE.Vector3();
  right_bottom_vec.x = right_bottom.x;
  right_bottom_vec.y = right_bottom.y;
  right_bottom_vec.z = right_bottom.z;
  var right_top_vec = new THREE.Vector3();
  right_top_vec.x = right_top.x;
  right_top_vec.y = right_top.y;
  right_top_vec.z = right_top.z;
  var left_bottom_vec = new THREE.Vector3();
  left_bottom_vec.x = left_bottom.x;
  left_bottom_vec.y = left_bottom.y;
  left_bottom_vec.z = left_bottom.z;
  left_top_vec = left_top_vec.unproject(camera);
  right_bottom_vec = right_bottom_vec.unproject(camera);
  right_top_vec = right_top_vec.unproject(camera);
  left_bottom_vec = left_bottom_vec.unproject(camera);

  // center
  var center_vec = new THREE.Vector3();
  center_x = (left_top.x + right_bottom.x) / 2.;
  center_y = (left_top.y + right_bottom.y) / 2.;
  center_z = left_top.z;
  center_vec.x = center_x
  center_vec.y = center_y
  center_vec.z = center_z
  center_vec = center_vec.unproject(camera);
  console.log(center_vec);
  var old_pos = camera.position.clone();
  camera.position.set(center_vec.x, center_vec.y, center_vec.z);
  return [center_vec, old_pos];
}

function get_camera_matrix() {
  camera.updateMatrix();
  return camera.matrix.clone();
}

function load_connections(scan) {
	var pose_url  = "./public/connectivity/"+scan+"_connectivity.json";
	var data = fs.readFileSync(pose_url);
	connections = data.toString();
	connections = JSON.parse(connections);
	// Create a cylinder frame for showing arrows of directions
	cylinder_frame = matt.load_viewpoints(connections, {opacity:1});
	// Keep a structure of connection graph
	id_to_ix = {};
	for (var i = 0; i < connections.length; i++) {
	  var im = connections[i]['image_id'];
	  id_to_ix[im] = i;
	}
	world_frame.add(cylinder_frame);
}

function move_to(image_id, isInitial=false) {
  // Adjust cylinder visibility
  var cylinders = cylinder_frame.children;
  for (var i = 0; i < cylinders.length; ++i){
    cylinders[i].visible = connections[id_to_ix[image_id]]['unobstructed'][i] && cylinders[i].included;
  }
  // Correct world frame for individual skybox camera rotation
  var inv = new THREE.Matrix4();
  var cam_pose = cylinder_frame.getObjectByName(image_id);
  inv.getInverse(cam_pose.matrix);
  var ignore = new THREE.Vector3();
  inv.decompose(ignore, world_frame.quaternion, world_frame.scale);
  world_frame.updateMatrix();
  if (isInitial){
    set_camera_pose(cam_pose.matrix, cam_pose.height);
  } else {
    set_camera_position(cam_pose.matrix, cam_pose.height);
  }
  curr_image_id = image_id;
}

function set_camera_pose(matrix4d, height){
  matrix4d.decompose(camera_pose.position, camera_pose.quaternion, camera_pose.scale);
  camera_pose.position.z += height;
  camera_pose.rotateX(Math.PI); // convert matterport camera to webgl camera
}

function set_camera_position(matrix4d, height) {
  var ignore_q = new THREE.Quaternion();
  var ignore_s = new THREE.Vector3();
  matrix4d.decompose(camera_pose.position, ignore_q, ignore_s);
  camera_pose.position.z += height;
}

function skybox_init() {
  // test if webgl is supported
  // if (! Detector.webgl) Detector.addGetWebGLMessage();

  // create the camera (kinect 2)
  camera = new THREE.PerspectiveCamera(VFOV, ASPECT, 0.01, 1000);

  camera_pose = new THREE.Group();
  camera_pose.add(camera);

  // create the Matterport world frame
  world_frame = new THREE.Group();

  // create the cubemap frame
  cubemap_frame = new THREE.Group();
  cubemap_frame.rotation.x = -Math.PI; // Adjust cubemap for z up
  cubemap_frame.add(world_frame);

  // create the Scene
  scene = new THREE.Scene();
  world_frame.add(camera_pose);
  scene.add(cubemap_frame);

  var light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
  light.position.set(0, 0, 100);
  world_frame.add(light);
  world_frame.add(new THREE.AmbientLight( 0xAAAAAA )); // soft light

  // init the WebGL renderer
  // renderer = new THREE.WebGLRenderer({canvas: document.getElementById("skybox"), antialias: true, preserveDrawingBuffer: true } );
  // renderer.setSize(SIZE_X, SIZE_Y);

  // controls = new THREE.PTZCameraControls(camera, renderer.domElement);
  // controls.minZoom = 1;
  // controls.maxZoom = 3.0;
  // controls.minTilt = -0.6*Math.PI/2;
  // controls.maxTilt = 0.6*Math.PI/2;
  // controls.enableDamping = true;
  // controls.panSpeed = -0.25;
  // controls.tiltSpeed = -0.25;
  // controls.zoomSpeed = 1.5;
  // controls.dampingFactor = 0.5;

  // controls.addEventListener( 'select', select );
  // controls.addEventListener( 'change', onChange );
}
