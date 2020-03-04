
const server_url = ' http://localhost:3000/';

var step = 0;
// var playing = false;
// var downloading = false;
var scan;
var scan_arr;
var curr_image_id;
var capturer;
var frameRate = 60.0;
var pauseStart = 1000;
var pauseEnd = 3000;

// declare a bunch of variable we will need later
var camera, camera_pose, scene, controls, renderer, connections, id_to_ix, world_frame, cylinder_frame, cubemap_frame, line_frame;
var fp_scene, fp_camera, fp_renderer, dollhouse, mesh_names;
var mouse = new THREE.Vector2();
var id, gt;
var userName;
var scan_examples = ['vyrNrziPKCB', 'aayBHfsNo7d', 'B6ByNegPMKs'];

var ix = 0;
var SIZE_X = 1140;
var SIZE_Y = 650;
var VFOV = 80;
var ASPECT = SIZE_X/SIZE_Y;

var FP_SIZE_X = 960;
var FP_SIZE_Y = 720;
var FP_VFOV = 70;
var FP_ASPECT = FP_SIZE_X/FP_SIZE_Y;

var $ix=document.getElementById('ix');
var $width=document.getElementById('width');
var $height=document.getElementById('height');
var $vfov=document.getElementById('vfov');
var $scan_id=document.getElementById('scan_id');
// var $play=document.getElementById('play');
// var $download=document.getElementById('download');
var $canvas=document.getElementById('skybox');


// set the initial input-text values to the width/height vars
$ix.value=ix;
$width.value=SIZE_X;
$height.value=SIZE_Y;
$vfov.value=VFOV;

var matt = new Matterport3D("");
$(document).ready(function() {
  $("#back").attr("style","display:none;");
  var user_name = prompt('Please input your user name:');
    while (user_name == undefined || user_name == ""){
      user_name = prompt('Please input your user name:');
    }
    userName = user_name;
    $.ajax({
          type: "get",
          url: server_url + 'userBbox/' + user_name,
          dataType: "json",
          success:function (data) {
            console.log(data);
            if (data != null) {
              scan_arr = data['scans'];
              draw();
            } else {
              alert("标注人员已满，多谢支持");
            }
          }
     });
})

function examples() {
  scan_arr = scan_examples;
  ix = 0;
  $ix.value=ix;
  draw();
  $("#drawBbox").attr("style","display:none;");
  $("#resetBbox").attr("style","display:none;");
  $("#saveBbox").attr("style","display:none;");
  $("#back").attr("style","display:black;");
}

function backToDraw() {
  $.ajax({
        type: "get",
        url: server_url + 'userBbox/' + userName,
        dataType: "json",
        success:function (data) {
          console.log(data);
          if (data != null) {
            scan_arr = data['scans'];
            ix = 0;
            $ix.value=ix;
            draw();
            $("#drawBbox").attr("style","display:black;");
            $("#resetBbox").attr("style","display:black;");
            $("#saveBbox").attr("style","display:black;");
            $("#back").attr("style","display:none;");
          } else {
            alert("标注人员已满，多谢支持");
          }
        }
   });
}

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

$width.addEventListener("keyup", function(){
  if (this.value > 100 && this.value <=1280){
    SIZE_X=this.value;
    ASPECT = SIZE_X/SIZE_Y;
    draw();
  }
}, false);

$height.addEventListener("keyup", function(){
  if (this.value > 100 && this.value <=720){
    SIZE_Y=this.value;
    ASPECT = SIZE_X/SIZE_Y;
    draw();
  }
}, false);

$vfov.addEventListener("keyup", function(){
    VFOV=this.value;
    draw();
}, false);

document.getElementById('show-instructions').addEventListener("change", function(){
  move_to(curr_image_id);
});

// document.getElementById('trajFile').addEventListener("change", function(evt){
//   reset();
//   ix = 0;
//   $ix.value=ix;
//   var file = evt.target.files[0];
//   $('#fileName').text(file.name);
//   initialize();
// }, false);

function draw(){
  // id = traj[ix]['instr_id'];
  // $instr_id.value=id;
  // path = traj[ix]['trajectory'];
  // var found = false;
  // for (var i = 0; i < gt.length; i++) {
  //   if (gt[i]['path_id'] == id.split('_')[0]) {
  //     scan = gt[i]['scan'];
  //     curr_image_id = gt[i]['path'][0];
  //     instr = gt[i]['instructions'][parseInt(id.split('_')[1])];
  //     $('#instruction').text(instr);
  //     found = true;
  //     break;
  //   }
  // }
  // if (found){
  //   skybox_init();
  //   load_connections(scan, curr_image_id);
  // } else {
  //   console.error('instruction id ' + id + ' not in something');
  // }

  // id = gt[ix]['scan'];
  id = scan_arr[ix];
  scan = id;
  $scan_id.value = id;
  var img_path = "../data/v1/scans/" + scan + "/matterport_skybox_images/";
  $.ajax({
          type: "get",  // 请求方式
          url: server_url + 'firstStart/' + id,  // 目标资源
          dataType: "json",  // 服务器响应的数据类型
          success : function (data) {  // readystate == 4 && status == 200
              if(data.status == 0) {
                // success
                curr_image_id = data.image_id;
                skybox_init();
                load_connections(scan, curr_image_id);
              } else {
                console.log('no such file');
              }
          }
     });
}

var drawRec = true;
var mouseArray = [];
var pointsArray = [];
function startDraw(){
  drawRec = false;
  var canvas = document.getElementById("skybox");
  canvas.removeEventListener('mousedown', rightButtonDown, false);
  canvas.addEventListener('mousedown', onMouseDown, false);
}

function resetDraw(){
  drawRec = true;
  var line = scene.getObjectByName('line');
  var left_top = scene.getObjectByName('left_top');
  var right_bottom = scene.getObjectByName('right_bottom');
  var left_bottom = scene.getObjectByName('left_bottom');
  var right_top = scene.getObjectByName('right_top');
  scene.remove(line);
  scene.remove(left_top);
  scene.remove(right_bottom);
  scene.remove(left_bottom);
  scene.remove(right_top);
  render();
  var canvas = document.getElementById("skybox");
  canvas.addEventListener('mousedown', rightButtonDown, false);
  mouseArray = [];
  pointsArray = [];
}

function saveDraw(){
  var left_top = scene.getObjectByName('left_top');
  var right_bottom = scene.getObjectByName('right_bottom');
  var right_top = scene.getObjectByName('right_top');
  var left_bottom = scene.getObjectByName('left_bottom');

  if (mouseArray[0] == undefined || mouseArray[1] == undefined || mouseArray[2] == undefined || mouseArray[3] == undefined) {
    return; 
  }

  var obj_name = prompt('Please input the name of the object:');
  if (obj_name == undefined || obj_name == ""){
    alert("名字不合法");
    return;
  }

  var m = get_camera_pose();
  // var [m1, m2] = get_camera_and_pose_matrix();

  // calculate heading
  var rot = new THREE.Matrix3();
  rot.setFromMatrix4(m);
  var cam_look = new THREE.Vector3(0,0,1); // based on matterport camera
  cam_look.applyMatrix3(rot);
  heading = -Math.PI/2.0 -Math.atan2(cam_look.y, cam_look.x);
  if (heading < 0) {
    heading += 2.0*Math.PI;
  }

  // calculate elevation
  elevation = -Math.atan2(cam_look.z, Math.sqrt(Math.pow(cam_look.x,2) + Math.pow(cam_look.y,2)))

  

  var camera_matrix, camera_pose_matrix
  var matrix_list = get_all_four_matrix()
  camera_matrix = matrix_list[0]
  camera_pose_matrix = matrix_list[1]
  world_frame_matrix = matrix_list[2]
  cubemap_frame_matrix = matrix_list[3]
  var boundingbox = {
    "scan": scan,
    "image_id": curr_image_id,
    "camera_matrix": camera_matrix.elements,
    "camera_pose_matrix": camera_pose_matrix.elements,
    "world_frame_matrix": world_frame_matrix.elements,
    "cubemap_frame_matrix": cubemap_frame_matrix.elements,
    "cam_rotation": camera.rotation,
    "heading": heading,
    "elevation": elevation,
    "mouse_left_top": {
      "x": mouseArray[0].x,
      "y": mouseArray[0].y,
      "z": mouseArray[0].z
    },
    "mouse_right_top": {
      "x": mouseArray[2].x,
      "y": mouseArray[2].y,
      "z": mouseArray[2].z
    },
    "mouse_left_bottom": {
      "x": mouseArray[3].x,
      "y": mouseArray[3].y,
      "z": mouseArray[3].z
    },
    "mouse_right_bottom": {
      "x": mouseArray[1].x,
      "y": mouseArray[1].y,
      "z": mouseArray[1].z
    },
    "obj_name": obj_name
  }
  $.ajax({
    type: "POST",
    url: server_url + "savePoint/",
    contentType: "application/json",
    dataType:"json",
    data:JSON.stringify(boundingbox),
    success:function (data) {
      window.confirm('save already');
    }
  })

  resetDraw();
  get_boundingbox(curr_image_id);
  render()
}

// function initialize(){
//   d3.queue()
//   .defer(d3.json, "/R2Rdata/R2R_val_seen.json")
//   .defer(d3.json, "/R2Rdata/R2R_val_unseen.json")
//   .defer(d3.json, "/R2Rdata/R2R_test.json")
//   .await(function(error, d1, d2, d3) {
//     if (error) {
//       console.error(error);
//     }
//     else {
//       gt = d1.concat(d2).concat(d3);
//       draw();
//     }
//   });
// }
// var matt = new Matterport3D("");
// initialize();

/* 获取射线与平面相交的交点 */
function getIntersects(event) {

  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector3();

  var canvas = document.getElementById("skybox");

  canvasPosition = $(canvas).position();

  mouse.set(
      ((event.clientX - canvasPosition.left) / canvas.width) * 2 - 1,
      - ((event.clientY - canvasPosition.top) / canvas.height) * 2 + 1,
      0.5 );
  mouseArray.push(mouse);

  //向量
  // var normal = new THREE.Vector3(0, 0, 1);
  // /* 创建平面 */
  // var planeGround = new THREE.Plane(normal, 0);

  // // var m = get_camera_pose();
  // // planeGround.applyMatrix(m);

  // /* 从相机发出一条射线经过鼠标点击的位置 */
  // raycaster.setFromCamera(mouse, camera);

  // /* 获取射线 */
  // var ray = raycaster.ray;

  // /* 计算相机到射线的对象，可能有多个对象，返回一个数组，按照距离相机远近排列 */
  // var intersects = ray.intersectPlane(planeGround);

  // // intersects.z = 0;
  // console.log("x:"+intersects.x+" y:"+intersects.y+" z:"+intersects.z);
  var intersects = mouse.clone();
  var intersects = intersects.unproject(camera);

  /* 返回向量 */
  return intersects;

}

/* press right button on cylinders to move */
function rightButtonDown(event) {
  if (event.button == 2) {
    var mouse = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    var canvas = document.getElementById("skybox");
    canvasPosition = $(canvas).position();
    mouse.x = ((event.clientX - canvasPosition.left) / canvas.width) * 2 - 1;
    mouse.y = - ((event.clientY - canvasPosition.top) / canvas.height) * 2 + 1;
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

function onMouseDown(event) {
  var canvas = document.getElementById("skybox");

  /* 获取相机发出的射线与 Plane 相交点*/
  var intersects = getIntersects(event);

  /* 存放网格的三维坐标 */
  var vector3_x, vector3_z;

  /* 鼠标左键按下时，创建点和线段 */
  if (event.button === 0) {
    // if (!window_mouse){

    //     canvas.addEventListener('mousedown', mouseDown, false);

    //     /* 依据 windwo_mouse 标识避免事件的重复添加 */
    //     window_mouse = true;

    // }

    var pointsGeometry = new THREE.Geometry();
    pointsGeometry.vertices.push(intersects);

    var pointsMaterial = new THREE.PointsMaterial({color:0xff0000, size: 0.0015});
    var points = new THREE.Points(pointsGeometry, pointsMaterial);

    pointsArray.push(points);
    console.log(pointsArray.length);

    /* 创建线段 */
    var lineGeometry = new THREE.Geometry();
    var lineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});

    if (pointsArray.length == 2) {

        // var rightTop = new THREE.Vector3();
        // rightTop.x = pointsArray[1].geometry.vertices[0].x;
        // rightTop.y = pointsArray[0].geometry.vertices[0].y;
        // rightTop.z = pointsArray[0].geometry.vertices[0].z;
        // var leftBottom = new THREE.Vector3();
        // leftBottom.x = pointsArray[0].geometry.vertices[0].x;
        // leftBottom.y = pointsArray[1].geometry.vertices[0].y;
        // leftBottom.z = pointsArray[1].geometry.vertices[0].z;

        // lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0], rightTop);
        // lineGeometry.vertices.push(pointsArray[1].geometry.vertices[0], leftBottom);
        // lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0]);

        var rightTop = new THREE.Vector3();
        rightTop.x = mouseArray[1].x;
        rightTop.y = mouseArray[0].y;
        rightTop.z = 0.5;
        var leftBottom = new THREE.Vector3();
        leftBottom.x = mouseArray[0].x;
        leftBottom.y = mouseArray[1].y;
        leftBottom.z = 0.5;
        mouseArray.push(rightTop);
        mouseArray.push(leftBottom);
        var rightTopVec = rightTop.clone();
        var leftBottomVec = leftBottom.clone();
        console.log("rightTopVec1", rightTopVec)
        rightTopVec = rightTopVec.unproject(camera);
        console.log("rightTopVec2", rightTopVec)
        var widthHalf = 0.5*renderer.context.canvas.width;
        var heightHalf = 0.5*renderer.context.canvas.height;
        var right_top_vec_copy = rightTopVec.clone()
        var proj = right_top_vec_copy.project(camera);
        proj.x = Math.round( proj.x * widthHalf  ) + widthHalf;
        proj.y = Math.round( -proj.y * heightHalf  ) + heightHalf;
        console.log(proj.x, proj.y)
        // var projectedPosition = rightTopVec.applyMatrix4(rightTopVec.matrixWorld).project(camera)
        // console.log("projectedPosition2", projectedPosition)
        leftBottomVec = leftBottomVec.unproject(camera);
        var rightTopPointGeometry = new THREE.Geometry();
        rightTopPointGeometry.vertices.push(rightTopVec);
        var rightTopPoint = new THREE.Points(rightTopPointGeometry, pointsMaterial);
        rightTopPoint.name = 'right_top';
        var leftBottomPointGeometry = new THREE.Geometry();
        leftBottomPointGeometry.vertices.push(leftBottomVec);
        var leftBottomPoint = new THREE.Points(leftBottomPointGeometry, pointsMaterial);
        leftBottomPoint.name = 'left_bottom';
        scene.add(rightTopPoint);
        scene.add(leftBottomPoint);

        lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0], rightTopVec);
        lineGeometry.vertices.push(pointsArray[1].geometry.vertices[0], leftBottomVec);
        lineGeometry.vertices.push(pointsArray[0].geometry.vertices[0]);

        var line = new THREE.Line(lineGeometry, lineMaterial);
        line.name = "line";
        scene.add(line);
        points.name = "right_bottom";
        scene.add(points);
        pointsArray.shift();
        pointsArray.shift();
        drawRec = true;
        canvas.removeEventListener('mousedown', onMouseDown, false);

    } else {
      points.name = "left_top";
      scene.add(points);
    }
    render();
  }
}

// ## Initialize everything
function skybox_init(scan, image) {
  // test if webgl is supported
  if (! Detector.webgl) Detector.addGetWebGLMessage();

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
  // scene.add(box_mesh);

  var light = new THREE.DirectionalLight( 0xFFFFFF, 1 );
  light.position.set(0, 0, 100);
  world_frame.add(light);
  world_frame.add(new THREE.AmbientLight( 0xAAAAAA )); // soft light

  // init the WebGL renderer - preserveDrawingBuffer is needed for toDataURL()
  renderer = new THREE.WebGLRenderer({canvas: $canvas, antialias: true, preserveDrawingBuffer: true } );
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
  controls.addEventListener( 'change', render );
}

function load_bbox(scan) {
  var bbox_url = '/bbox/' + scan + '_boundingbox.json';
  d3.json(bbox_url, function(error, data) {
    if (error) return console.warn(error);
    line_frame = matt.load_bbox(data);
    world_frame.add(line_frame);
  });
}

function load_connections(scan, image_id) {
  var pose_url = "/connectivity/"+scan+"_connectivity.json";
  d3.json(pose_url, function(error, data) {
    if (error) return console.warn(error);
    connections = data;
    // Create a cylinder frame for showing arrows of directions
    cylinder_frame = matt.load_viewpoints(data, {opacity:0.4});
    // Keep a structure of connection graph
    id_to_ix = {};
    for (var i = 0; i < data.length; i++) {
      var im = data[i]['image_id'];
      id_to_ix[im] = i;
    }

    world_frame.add(cylinder_frame);

    // var image_id = path[0][0];
    matt.loadCubeTexture(cube_urls(scan, image_id)).then(function(texture){
      scene.background = texture;
      move_to(image_id, true);
      // $play.disabled = false;
      // $download.disabled = false;
    });
  });
}

function cube_urls(scan, image_id) {
  var urlPrefix  = "data/v1/scans/" + scan + "/matterport_skybox_images/" + image_id;
  return [ urlPrefix + "_skybox2_sami.jpg", urlPrefix + "_skybox4_sami.jpg",
      urlPrefix + "_skybox0_sami.jpg", urlPrefix + "_skybox5_sami.jpg",
      urlPrefix + "_skybox1_sami.jpg", urlPrefix + "_skybox3_sami.jpg" ];
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
  render();
}

function get_boundingbox(image_id) {
  var last_line = scene.getObjectByName(curr_image_id + '_line');
  scene.remove(last_line);
  var m = get_camera_pose();

  // calculate heading
  var rot = new THREE.Matrix3();
  rot.setFromMatrix4(m);
  var cam_look = new THREE.Vector3(0,0,1); // based on matterport camera
  cam_look.applyMatrix3(rot);
  heading = -Math.PI/2.0 -Math.atan2(cam_look.y, cam_look.x);
  if (heading < 0) {
    heading += 2.0*Math.PI;
  }

  // calculate elevation
  elevation = -Math.atan2(cam_look.z, Math.sqrt(Math.pow(cam_look.x,2) + Math.pow(cam_look.y,2)));

  var roomInfo = {
    'scan': scan,
    'image_id': image_id,
    'heading': heading,
    'elevation': elevation
  }

  $.ajax({
    type: "POST",
    url: server_url + "getPoint/",
    contentType: "application/json",
    dataType:"json",
    data:JSON.stringify(roomInfo),

    success:function (data) {
      console.log(data);
      if(data != null) {
        console.log("data", data)
        cubemap_frame.updateMatrix();	
        var cubemap_frame_matrix = cubemap_frame.matrix.clone();	
        world_frame.updateMatrix();	
        var world_frame_matrix = world_frame.matrix.clone();	
        camera_pose.updateMatrix();	
        var camera_pose_matrix = camera_pose.matrix.clone();	
        camera.updateMatrix();	
        var camera_matrix = camera.matrix.clone();
        for (var i in data)
        {
          draw_bboxes(data[i])
        }
        cubemap_frame_matrix.decompose(cubemap_frame.position, cubemap_frame.quaternion, cubemap_frame.scale);	
        cubemap_frame.updateMatrix();	
        world_frame_matrix.decompose(world_frame.position, world_frame.quaternion, world_frame.scale);	
        world_frame.updateMatrix();	
        camera_pose_matrix.decompose(camera_pose.position, camera_pose.quaternion, camera_pose.scale);	
        camera_pose.updateMatrix();	
        camera_matrix.decompose(camera.position, camera.quaternion, camera.scale);	
        camera.updateMatrix();	
        render()
      }
    }
  })
}

function move_to(image_id, isInitial=false) {
  // Adjust cylinder visibility
  var cylinders = cylinder_frame.children;
  for (var i = 0; i < cylinders.length; ++i){
    // if ($('#show-instructions').is(":checked")){
      // cylinders[i].visible = connections[id_to_ix[image_id]]['unobstructed'][i];
    cylinders[i].visible = connections[id_to_ix[image_id]]['unobstructed'][i] && cylinders[i].included;
    // } else {
    //   cylinders[i].visible = false;
    // }
  }
  // var lines = line_frame.children;
  // for (var i = 0; i < lines.length; ++i)
  //   lines[i].visible = lines[i].included;
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
  get_boundingbox(image_id);
  render();
  curr_image_id = image_id;
  var canvas = document.getElementById("skybox");
  canvas.addEventListener('mousedown', rightButtonDown, false);
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

function get_camera_and_pose_matrix() {
  camera.updateMatrix();
  camera_pose.updateMatrix();
  return [camera.matrix.clone(), camera_pose.matrix.clone()];
}
function get_all_four_matrix() {
  camera.updateMatrix();
  camera_pose.updateMatrix();
  world_frame.updateMatrix();
  cubemap_frame.updateMatrix();
  return [camera.matrix.clone(), camera_pose.matrix.clone(), world_frame.matrix.clone(), cubemap_frame.matrix.clone()];
}

function get_pose_string(){
  var m = get_camera_pose();

  // calculate heading
  var rot = new THREE.Matrix3();
  rot.setFromMatrix4(m);
  var cam_look = new THREE.Vector3(0,0,1); // based on matterport camera
  cam_look.applyMatrix3(rot);
  heading = -Math.PI/2.0 -Math.atan2(cam_look.y, cam_look.x);
  if (heading < 0) {
    heading += 2.0*Math.PI;
  }

  // calculate elevation
  elevation = -Math.atan2(cam_look.z, Math.sqrt(Math.pow(cam_look.x,2) + Math.pow(cam_look.y,2)))

  return scan+"_"+curr_image_id+"_"+heading+"_"+elevation;
}

function take_action(image_id) {
  // image_id = dest[0]
  // heading = dest[1]
  // elevation = dest[2]
  if (image_id !== curr_image_id) {
    var texture_promise = matt.loadCubeTexture(cube_urls(scan, image_id)); // start fetching textures
    var target = cylinder_frame.getObjectByName(image_id);

    // Camera up vector
    var camera_up = new THREE.Vector3(0,1,0);
    var camera_look = new THREE.Vector3(0,0,-1);
    var camera_m = get_camera_pose();// Animation
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
    var new_vfov = VFOV*0.95;
    var zoom_tween = new TWEEN.Tween({
      vfov: VFOV})
    .to( {vfov: new_vfov }, 1000 )
    .easing(TWEEN.Easing.Cubic.InOut)
    .onStart(function() {
      // Color change effect
      target.material.emissive.setHex( 0xff0000 );
      setTimeout(function(){ target.material.emissive.setHex( target.currentHex ); }, 200);
    })
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
  } else {
    // Just move the camera
    // Animation
    // if (playing) {
    //   step_forward();
    // }
  }
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


