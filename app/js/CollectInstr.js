const server_url = ' http://localhost:7878/';

//var ix = ${ix}   // UNCOMMENT THIS LINE WHEN INTEGRATING WITH AMT
// var ix = location.search.split('ix=')[1];   // UNCOMMENT THIS LINE TO RUN UI LOCALLY WITH GULP
var ix = 0;
var step = 0;
var playing = false;
var scan;
var curr_image_id;
var start_heading = 0;
var start_pose, start_camera_pose;

// declare a bunch of variable we will need later
var camera, camera_pose, scene, controls, renderer, connections, id_to_ix, world_frame, cylinder_frame, cubemap_frame;
var mouse = new THREE.Vector2();
var id;

var SIZE_X = 1140;
var SIZE_Y = 650;
var VFOV = 80;
var ASPECT = SIZE_X/SIZE_Y;

var scan = "vyrNrziPKCB";

var matt = new Matterport3D("");
matt.loadJson('bbox/' + scan + '_boundingbox.json').then(function(data){
  ix_max = data.length;
  var bbox = data[ix.toString()];
  curr_image_id = bbox['image_id'];
  start_heading = bbox['heading'];
  start_pose = bbox['pose'];
  start_rotation = bbox['cam_rotation'];
  skybox_init();
  console.log(get_camera_pose())
  console.log(camera.rotation)
  load_connections(scan, curr_image_id);
});

function get_random_property() {
    var rand1 = Math.random();
    var rand2 = Math.random();
    var num1 = Math.floor(rand1 * 5);
    var num2 = Math.floor(rand2 * 5);
    if(num1 == num2) {
        if(num1 < 5) {
            num2++;
        }else{
            num2--;
        }
    }
    
    var properties = new Array('color', 'shape', 'material', 'state', 'size', 'pose');
    return [properties[num1], properties[num2]];
};

function play_animation() {
  if (!playing){
    document.getElementById("play").disabled = true;
    // First move back to start
    var image_id = path['path'][0];
    matt.loadCubeTexture(cube_urls(scan, image_id)).then(function(texture){
      camera.rotation.x = 0;
      camera.rotation.y = -start_heading; 
      camera.rotation.z = 0;
      scene.background = texture;
      render();
      move_to(image_id, true);
      step = 0;
      playing = true;
      step_forward();
    });
  }
}

function step_forward(){
  step += 1;
  if (step >= path['path'].length) {
    step -= 1;
    playing = false;
    document.getElementById("play").disabled = false;
  } else {
    take_action(path['path'][step]);
  }
};

function step_backward(){
  step -= 1;
  if (step < 0) {
    step = 0;
    return;
  }
  take_action(path['path'][step]);
};

// ## Initialize everything
function skybox_init() {
  // test if webgl is supported
  if (! Detector.webgl) Detector.addGetWebGLMessage();

  // create the camera (kinect 2)
  camera = new THREE.PerspectiveCamera(VFOV, ASPECT, 0.01, 1000);

  // Set the initial heading
  // camera.rotation.y = -start_heading;

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
  renderer = new THREE.WebGLRenderer({canvas: document.getElementById("skybox"), antialias: true, preserveDrawingBuffer: true } );
  renderer.setSize(SIZE_X, SIZE_Y);

  controls = new THREE.PTZCameraControls(camera, renderer.domElement);
  controls.minZoom = 1;
  controls.maxZoom = 3.0;
  controls.minTilt = -0.6*Math.PI/2;
  controls.maxTilt = 0.6*Math.PI/2;
  controls.enableDamping = true;
  controls.panSpeed = -0.25;
  controls.tiltSpeed = -0.25;
  controls.zoomSpeed = 1.5;
  controls.dampingFactor = 0.5;

  controls.addEventListener( 'select', select );
  controls.addEventListener( 'change', onChange );
}

function select(event) {
  if (!playing) {
    var mouse = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    mouse.x = ( event.x / SIZE_X ) * 2 - 1;
	  mouse.y = - ( event.y / SIZE_Y ) * 2 + 1;
	  raycaster.setFromCamera( mouse, camera );
	  var intersects = raycaster.intersectObjects( cylinder_frame.children );
	  if ( intersects.length > 0 ) {
      intersects[0].object.currentHex = intersects[0].object.material.emissive.getHex();
      intersects[0].object.material.emissive.setHex( 0xff0000 );
      image_id = intersects[ 0 ].object.name;
      take_action(image_id);
      setTimeout(function(){ intersects[0].object.material.emissive.setHex( intersects[0].object.currentHex ); }, 200);
	  }
  }
}

function load_connections(scan, image_id) {
  var pose_url  = "/connectivity/"+scan+"_connectivity.json";
  d3.json(pose_url, function(error, data) {
    if (error) return console.warn(error);
    connections = data;
    // Create a cylinder frame for showing arrows of directions
    cylinder_frame = matt.load_viewpoints(data, {opacity:1});
    // Keep a structure of connection graph
    id_to_ix = {};
    for (var i = 0; i < data.length; i++) {
      var im = data[i]['image_id'];
      id_to_ix[im] = i;
    }
    world_frame.add(cylinder_frame);
    
    matt.loadCubeTexture(cube_urls(scan, image_id)).then(function(texture){
      scene.background = texture;
      move_to(image_id, true);
      // get_boundingbox(curr_image_id);
    });
  });
}

function cube_urls(scan, image_id) {
  var urlPrefix  = "data/v1/scans/" + scan + "/matterport_skybox_images/" + image_id;
  return [ urlPrefix + "_skybox2_sami.jpg", urlPrefix + "_skybox4_sami.jpg",
      urlPrefix + "_skybox0_sami.jpg", urlPrefix + "_skybox5_sami.jpg",
      urlPrefix + "_skybox1_sami.jpg", urlPrefix + "_skybox3_sami.jpg" ];
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
  	// var m1 = new THREE.Matrix4();
   //  m1.fromArray(start_camera);
   //  m1.transpose(); // switch row major to column major to suit three.js
   //  var m2 = new THREE.Matrix4();
   //  m2.fromArray(start_camera_pose);
   //  m2.transpose();
    var inv = new THREE.Matrix4();
    var m = new THREE.Matrix4();
    m.fromArray(start_pose);
    // var tcamera = camera.clone();
    // m.transpose();
    // var m1 = m.clone();
    // inv.getInverse(m1);
    // set_camera_pose(m, 0);
    // camera.matrix.fromArray(JSON.parse(start_cam)).transpose();
    m.decompose(camera.position, camera.quaternion, camera.scale);
    // camera.rotation.x = start_rotation['_x'];
    // camera.rotation.y = start_rotation['_y'];
    // camera.rotation.z = start_rotation['_z'];
    // camera.rotateZ(Math.PI);
    // var ignore = new THREE.Vector3();
    // inv.decompose(ignore, world_frame.quaternion, world_frame.scale);
    // world_frame.updateMatrix();

    // set_camera_pose(m2, 0);
    // camera.matrix.set(m1);
    // camera.updateMatrixWorld(true);
    // set_camera_pose(cam_pose.matrix, cam_pose.height);
    get_boundingbox(image_id);
    // set_camera_pose(cam_pose.matrix, cam_pose.height);
  } else {
  	// var inv = new THREE.Matrix4();
  	// var cam_pose = cylinder_frame.getObjectByName(image_id);
   //  inv.getInverse(m);
   //  var ignore = new THREE.Vector3();
   //  inv.decompose(ignore, world_frame.quaternion, world_frame.scale);
   //  world_frame.updateMatrix();
    set_camera_position(cam_pose.matrix, cam_pose.height);
  }
  render();
  curr_image_id = image_id;
  // Animation
  // if (playing) {
  //   step_forward();
  // }
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

function get_camera_pose(){
  camera.updateMatrix();
  camera_pose.updateMatrix();
  var m = camera.matrix.clone();
  m.premultiply(camera_pose.matrix);
  return m;
}

function take_action(image_id) {
  var texture_promise = matt.loadCubeTexture(cube_urls(scan, image_id)); // start fetching textures
  var target = cylinder_frame.getObjectByName(image_id);

  // Camera up vector
  var camera_up = new THREE.Vector3(0,1,0);
  var camera_look = new THREE.Vector3(0,0,-1);
  var camera_m = get_camera_pose();
  var zero = new THREE.Vector3(0,0,0);
  camera_m.setPosition(zero);
  camera_up.applyMatrix4(camera_m);
  camera_up.normalize();
  camera_look.applyMatrix4(camera_m);
  camera_look.normalize();

  // look direction
  var look = target.position.clone();
  look.sub(camera_pose.position);
  look.projectOnPlane(camera_up);
  look.normalize();
  // Simplified - assumes z is zero
  var rotate = Math.atan2(look.y,look.x) - Math.atan2(camera_look.y,camera_look.x);
  if (rotate < -Math.PI) rotate += 2*Math.PI;
  if (rotate > Math.PI) rotate -= 2*Math.PI;

  var target_y = camera.rotation.y + rotate;
  var rotate_tween = new TWEEN.Tween({
    x: camera.rotation.x,
    y: camera.rotation.y,
    z: camera.rotation.z})
  .to( {
    x: 0,
    y: target_y,
    z: 0 }, 2000*Math.abs(rotate) )
  .easing( TWEEN.Easing.Cubic.InOut)
  .onUpdate(function() {
    camera.rotation.x = this.x;
    camera.rotation.y = this.y;
    camera.rotation.z = this.z;
    render();
  });
  var new_vfov = VFOV*0.8;
  var zoom_tween = new TWEEN.Tween({
    vfov: VFOV})
  .to( {vfov: new_vfov }, 2000 )
  .easing(TWEEN.Easing.Cubic.InOut)
  .onUpdate(function() {
    camera.fov = this.vfov;
    camera.updateProjectionMatrix();
    render();
  })
  .onComplete(function(){
    cancelAnimationFrame(id);
    texture_promise.then(function(texture) {
      scene.background = texture; 
      camera.fov = VFOV;
      camera.updateProjectionMatrix();
      move_to(image_id);
    });
  });
  rotate_tween.chain(zoom_tween);
  animate();
  rotate_tween.start();
}

function get_boundingbox(image_id) {
  var roomInfo = {
    'scan': scan,
    'image_id': image_id
  }
  $.ajax({
    type: "POST",
    url: server_url + "getPointByImage/",
    contentType: "application/json",
    dataType:"json",
    data:JSON.stringify(roomInfo),
    success:function (data) {
      console.log(data);
      if(data != null) {
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

        var lineGeometry = new THREE.Geometry();
        var lineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});

        lineGeometry.vertices.push(left_top_vec, right_top_vec);
        lineGeometry.vertices.push(right_bottom_vec, left_bottom_vec);
        lineGeometry.vertices.push(left_top_vec);

	    // var m = new THREE.Matrix4();
	    // m.fromArray(start_pose);
	    // m.transpose();
	    // var ignore_q = new THREE.Vector3();
	    // var ignore_s = new THREE.Vector3();
	    // var lineGroup = new THREE.Group();

        var line = new THREE.Line(lineGeometry, lineMaterial);
        line.name = curr_image_id + '_line';
        // line.position.set(camera.position.clone());
        // line.applyMatrix(m);
        // lineGroup.add(line);
        // m.decompose(line.position, ignore_q, ignore_s);
  //       line.position.copy( camera.position );
		// line.rotation.copy( camera.rotation );
		// line.updateMatrix();
		// line.translateZ( - 10 );
        scene.add(line);
        render();
      }
    }
  })
}

function onChange(){
  // if (!playing){
  //   document.getElementById("play").disabled = false;
  //   document.getElementById("tag1").disabled = false;
  // }
  render();
}

// Display the Scene
function render() {
  renderer.render(scene, camera);
}

// tweening
function animate() {
  id = requestAnimationFrame( animate );
  TWEEN.update();
}