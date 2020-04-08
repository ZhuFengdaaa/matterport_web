// const server_url = 'http://label-x3.dm-ai.cn/';
const server_url = 'http://localhost:3000/';

//var ix = ${ix}   // UNCOMMENT THIS LINE WHEN INTEGRATING WITH AMT
// var ix = location.search.split('ix=')[1];   // UNCOMMENT THIS LINE TO RUN UI LOCALLY WITH GULP
var ix = 0;
var ix_max = 0;
var instr_ix = 0;
var instr_max = 0;
var step = 0;
var playing = false;
var scan;
var scan_arr;
var curr_image_id;
var start_heading = 0;
var start_pose, start_camera_pose;

// declare a bunch of variable we will need later
var camera, camera_pose, scene, controls, renderer, connections, id_to_ix, world_frame, cylinder_frame, cubemap_frame;
var mouse = new THREE.Vector2();
var gt, id, instr, instrs;

var SIZE_X = 1140;
var SIZE_Y = 650;
var VFOV = 80;
var ASPECT = SIZE_X/SIZE_Y;

var userName;
var matt = new Matterport3D("");

var $ix=document.getElementById('ix');
var $scan_id=document.getElementById('scan_id');
var $canvas=document.getElementById('skybox');

var str = "<ul>"; 
var bbox_state = new Array();
var finished = new Array();

$(document).ready(function() {
	var user_name = prompt('Please input password:');
    while (user_name == undefined || user_name == ""){
      user_name = prompt('Please input password:');
    }
    userName = user_name;
    $.ajax({
          type: "get",
          url: server_url + 'admin/' + user_name,
          dataType: "json",
          success:function (data) {
            console.log(data);
            if (data != null) {
              scan_arr = data;
              ix = 0;
              $ix.value = ix;
              ix_max = scan_arr.length;
              scan = scan_arr[ix];
              draw();
              // skybox_init();
              // load_connections(scan);
            } else {
              alert("暂时没有标注好的数据，多谢支持");
            }
          }
     });
})

// listen for keyup events on width & height input-text elements
// Get the current values from input-text & set the width/height vars
// call draw to redraw the rect with the current width/height values
$ix.addEventListener("keyup", function(){
  // playing=false;
  ix=this.value;
  draw();
}, false);

function reset() {
  // playing = false;
  // downloading = false;
  step = 0;
  // $play.disabled = false;
  // $download.disabled = false;
}

function left() {
  reset();
  ix = ix - 1;
  if (ix < 0) { ix = scan_arr.length-1;}
  $ix.value=ix;
  draw();
}

function right() {
  reset();
  ix = ix + 1;
  if (ix >= scan_arr.length) { ix = 0;}
  $ix.value=ix;
  draw();
}

function draw() {
  id = scan_arr[ix];
  scan = id;
  $scan_id.value = id;
  $.ajax({
          type: "get",
          url: server_url + 'adminInstrBbox/' + scan,
          dataType: "json",
          success : function (data) {
              if(data != null) {
                instrs = data
                instr_ix = 0;
                skybox_init();
                load_connections(scan);
                // getFinishedList(instrs);
              } else {
                console.log('no such file');
              }
          }
     });
}

function newHouse() {
  $.ajax({
        type: "get",
        url: server_url + 'newHouseInstr/' + userName,
        dataType: "json",
        success:function (data) {
          console.log(data);
          if (data != null) {
            scan_arr = data['scans'];
            ix_max = scan_arr.length;
            alert("申请成功，可增加或减少Index的值来改变house")
          } else {
            alert("暂时没有标注好的数据，多谢支持");
          }
        }
   });
}


function getFinishedList(instrs) {
  str = '<ul>';
  bbox_state = new Array();
  finished = new Array();
  for (var i = 0; i < bboxes.length; i++) {
    bbox_i = bboxes[i];
    bbox_state[i] = i + '_' + bbox_i['obj_name'];
    finished[i] = false;
    $.ajax({
      async: false,
      type: "POST",
      url: server_url + 'getSpecificInstr/',
      contentType: "application/json",
      dataType: "json",
      data:JSON.stringify(bbox_i),
      success:function (data) {
        if (data != null) {
          if (data['step1'].length > 0 && data['step2'].length > 0 && data['step3'].length > 0 && data['step4'].length > 0 && data['step5'].length > 0) {
            finished[i] = true;
          }
        }
      }
    })
  }
  all_bbox_state = {
    'id': bbox_state,
    'state': finished
  }
  $("#navigation").html( forTree(all_bbox_state));
}
 
/*递归实现获取无级树数据并生成DOM结构*/
 
var forTree = function (data) {
  if (str.length > 4) 
    str = str.substring(0,str.length-5);
   var all_bbox_ln = data['id'];
   var all_bbox_finished = data['state'];
   for(var i=0; i<all_bbox_ln.length; i++) {
        var urlstr = "";
        try {
               
             if(all_bbox_finished[i]) {
                 urlstr = "<li onclick=exact_bbox(" + i + ")>" + all_bbox_ln[i] + " <span style=\"color:#FF0000\">done</span></li>";
             }else {
                  urlstr = "<li onclick=exact_bbox(" + i + ")>" + all_bbox_ln[i] + "</li>";
             }
              str+= urlstr;
        }catch(e) {}        
    }
    str += "</ul>"  
    return str; 
};

function initBbox() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0; //回到顶部
  instr_max = instrs.length;
  instr = instrs[instr_ix.toString()];
  curr_image_id = instr['bbox']['image_id'];
  // skybox_init();
  // load_connections(scan, curr_image_id);
  matt.loadCubeTexture(cube_urls(scan, curr_image_id)).then(function(texture){
    scene.background = texture;
    move_to(curr_image_id, true);
    // get_boundingbox(curr_image_id);
  });
}

function exact_bbox(id) {
  instr_ix = id;
  initBbox();
}

function next_bbox() {
	instr_ix += 1;
	if (instr_ix < instr_max) {
		initBbox();
	} else {
    instr_ix = 0;
    initBbox();
    // next house
		// ix += 1;
		// if (ix < ix_max) {
		// 	bbox_ix = 0;
		// 	id = gt[ix]['scan'];
		//     scan = id;
		//     matt.loadJson('../app/bbox/' + scan + '_boundingbox.json').then(function(data){
		//      bboxes = data;
		//      draw();
		//     })
		// }
	}
}

function pre_bbox() {
  instr_ix -= 1;
  if (instr_ix >= 0) {
    initBbox();
  } else {
    instr_ix = 0;
    initBbox();
  }
}

function get_random_property() {
  num1 = 0;
  num2 = 0;
  while(num1 == num2)
  {
    var rand1 = Math.random();
    var rand2 = Math.random();
    var num1 = Math.floor(rand1 * 5);
    var num2 = Math.floor(rand2 * 5);
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

function load_connections(scan) {
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

    initBbox();
  });
}

function cube_urls(scan, image_id) {
  var urlPrefix  = "data/v1/scans/" + scan + "/matterport_skybox_images/" + image_id;
  return [ urlPrefix + "_skybox2_sami.jpg", urlPrefix + "_skybox4_sami.jpg",
      urlPrefix + "_skybox0_sami.jpg", urlPrefix + "_skybox5_sami.jpg",
      urlPrefix + "_skybox1_sami.jpg", urlPrefix + "_skybox3_sami.jpg" ];
}

// get saved instructions
function extract_instr(){
  var data = instr;
  document.getElementById('tag1').value = data['step1'];
  document.getElementById('tag2').value = data['step2'];
  document.getElementById('tag3').value = data['step3'];
  document.getElementById('tag4').value = data['step4'];
  document.getElementById('tag5').value = data['step5'];
  document.getElementById('tag1').innerHTML = data['step1'];
  document.getElementById('tag2').innerHTML = data['step2'];
  document.getElementById('tag3').innerHTML = data['step3'];
  document.getElementById('tag4').innerHTML = data['step4'];
  document.getElementById('tag5').innerHTML = data['step5'];
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
    get_boundingbox();
    extract_instr();
  } else {
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
    z: 0 }, 400*Math.abs(rotate) )
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
  .to( {vfov: new_vfov }, 400 )
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

function draw_bboxes(data)
{
  console.log(data)
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
  render();
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
  // var widthHalf = 0.5*renderer.context.canvas.width;
  // var heightHalf = 0.5*renderer.context.canvas.height;
  // var right_top_vec_copy = right_top_vec.clone()
  // var proj = right_top_vec_copy.project(camera);
  // proj.x = Math.round( proj.x * widthHalf  ) + widthHalf;
  // proj.y = Math.round( -proj.y * heightHalf  ) + heightHalf;
  // console.log(proj.x, proj.y)
  left_bottom_vec = left_bottom_vec.unproject(camera);

  var lineGeometry = new THREE.Geometry();
  var lineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});

  lineGeometry.vertices.push(left_top_vec, right_top_vec);
  lineGeometry.vertices.push(right_bottom_vec, left_bottom_vec);
  lineGeometry.vertices.push(left_top_vec);

  var line = new THREE.Line(lineGeometry, lineMaterial);
  line.name = curr_image_id + '_line';
  scene.add(line);

  // center
  var lookAtVector = new THREE.Vector3(0,0, -1);
  lookAtVector.applyQuaternion(camera.quaternion);
  var center_vec = new THREE.Vector3();
  center_x = (left_top.x + right_bottom.x) / 2.;
  center_y = (left_top.y + right_bottom.y) / 2.;
  center_z = left_top.z;
  
  // center_vec.x = center_x
  // center_vec.y = center_y
  // center_vec.z = center_z
  // center_vec = center_vec.unproject(camera);
  // console.log(center_vec)
  // camera.position.set(center_vec.x, center_vec.y, center_vec.z);
  // camera.lookAt(scene.position);
  // camera.updateMatrix();

  // var lookAtVector = new THREE.Vector3(0,0, -1);
  var lookAtVector = new THREE.Vector3(0,0, -1);
  // console.log(lookAtVector)
  lookAtVector.applyQuaternion(camera.quaternion);
  var center_vec = new THREE.Vector3(0,0, -1);
  center_vec.x = (left_top.x + right_bottom.x + right_top.x + left_bottom.x)/4
  center_vec.y = (left_top.y + right_bottom.y + right_top.y + left_bottom.y)/4
  center_vec.z = (left_top.z + right_bottom.z + right_top.z + left_bottom.z)/4
  
  // center_vec = center_vec.unproject(camera)
  // console.log(lookAtVector)
  // lookAtVector = lookAtVector.unproject(camera)
  // center_vec = center_vec.unproject(camera)
  // lookAtVector.project(camera)
  // console.log(lookAtVector1)
  // console.log(lookAtVector)
  // lookAtVector.x = lookAtVector.x + center_vec.x
  // lookAtVector.y = lookAtVector.y + center_vec.y
  // lookAtVector.z = lookAtVector.z + center_vec.z
  // lookAtVector = lookAtVector.project(camera)
  // console.log(lookAtVector)
  // lookAtVector.z = lookAtVector.z + center_vec.z
  // lookAtVector = lookAtVector.project(camera)
  // console.log(lookAtVector)
  // lookAtVector.normalize()
  console.log(lookAtVector)
  // console.log(center_vec)
  // center_vec.normalize()
  console.log(center_vec)
  if(lookAtVector.z < 0)
    lookAtVector.x = lookAtVector.x + center_vec.x
  else
    lookAtVector.x = lookAtVector.x - center_vec.x
  lookAtVector.y = lookAtVector.y + center_vec.y
  // lookAtVector.z = lookAtVector.z + center_vec.z
  
  // if (center_vec.x < 0)
  //   lookAtVector.x -= center_vec.x;
  // else
  //   lookAtVector.x += center_vec.x;
  // if (center_vec.y < 0)
  //   lookAtVector.y += center_vec.y;
  // else
  //   lookAtVector.y += center_vec.y;
  camera.lookAt(lookAtVector)
  
  // var center_3d = data['center_3d'];
  // var correct_matrix = data['correct_matrix'];
  // camera.position.x += center_3d.x;
  // camera.position.y += center_3d.y;
  // camera.position.z -= center_3d.z;
  // camera.updateMatrix();
  // camera.position.copy(center_3d);
  // camera.lookAt(center_3d);
  // line.position.set(center_3d.x, center_3d.y, center_3d.z);
  // camera_pose.position.set(center_3d.x, center_3d.y, center_3d.z);
  // world_frame.position.set(center_3d.x, center_3d.y, center_3d.z);
  // cubemap_frame.position.set(center_3d.x, center_3d.y, center_3d.z);
  render();
}

function get_boundingbox() {
  var last_line = scene.getObjectByName(curr_image_id + '_line');
  scene.remove(last_line);

  var bbox = instrs[instr_ix]['bbox']
  draw_bboxes(bbox);
  var target_name = document.getElementById('target_name');
  target_name.innerText = bbox['obj_name'];
}

function saveInstrs() {
	if($('#tag1').val() == '' || $('#tag2').val() == '' || $('#tag3').val() == '' || $('#tag4').val() == '' || $('#tag5').val() == '') {
		alert("please complete the form");
	} else if (confirm('Sure to save?')) {
    console.log(bbox_ix)
		var instr_form = {
			"bbox": bboxes[bbox_ix],
			"step1": $('#tag1').val(),
			"step2": $('#tag2').val(),
			"step3": $('#tag3').val(),
			"step4": $('#tag4').val(),
			"step5": $('#tag5').val()
		}
		$.ajax({
			type: "POST",
			url: server_url + "saveInstruction/" + userName,
		    contentType: "application/json",
		    dataType:"json",
		    data:JSON.stringify(instr_form),
		    success:function (data) {
		      window.confirm('save already');
		      next_bbox();
		    }
		})
	}
}

function nextInstrs() {
  bbox_ix = bbox_ix + 1;
  if (bbox_ix >= bbox_max) { ix = 0;}
  $ix.value=ix;
  draw();
}

function onChange(){
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
