var express = require('express');
var fs = require('fs');
var image = require("imageinfo");
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json({limit: '10mb'}));  //body-parser 解析json格式数据
app.use(bodyParser.urlencoded({            //此项必须在 bodyParser.json 下面,为参数编码
  extended: true
}));

//设置允许跨域访问该服务.
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  //Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'application/json;charset=utf-8');
  next();
});

function readFileList(path) {
    var filesList = [];
    var files = fs.readdirSync(path);
    files.forEach(function (itm, index) {
	    var stat = fs.statSync(path + itm);
	    if (stat.isFile()) {

	        var obj = {};//定义一个对象存放文件的路径和名字
	        obj.path = path;//路径
	        obj.filename = itm//名字
	        filesList.push(obj);
	    }

	})
	return filesList;
}

function getImageFiles(path) {
	var imageList = [];

    readFileList(path).forEach((item) => {
        var ms = image(fs.readFileSync(item.path + item.filename));

        ms.mimeType && (imageList.push(item.filename))
    });
    return imageList;
}

function writeBbox(params){
    bbox_path = '../app/bbox/' + params.scan + '_boundingbox.json';
    if (!fs.existsSync(bbox_path)) {
    	fs.writeFileSync(bbox_path, '[]')
    }
    var data = fs.readFileSync(bbox_path);
    var bbox = data.toString();
    bbox = JSON.parse(bbox);
    bbox.push(params);//将传来的对象push进数组对象中
    var str = JSON.stringify(bbox);//因为nodejs的写入文件只认识字符串或者二进制数，所以把json对象转换成字符串重新写入json文件中
    fs.writeFileSync(bbox_path,str);
    console.log('----------write success-------------');
    return true;
}

function readBbox(scan, image_id, heading, elevation) {
	var data = fs.readFileSync('../app/bbox/' + scan + '_boundingbox.json');
	var bboxes = data.toString();
	bboxes = JSON.parse(bboxes);
	for (var i in bboxes) {
		var bbox = bboxes[i];
		if (bbox['scan'] == scan && bbox['image_id'] == image_id && Math.abs(bbox['heading'] - heading) < 0.01 && Math.abs(bbox['elevation'] - elevation) < 0.0001){
			return bbox;
		}
	}
	return null;
}

app.get('/firstStart/:scanId', function(req, res) {
	var files = getImageFiles('../app/data/v1/scans/' + req.params.scanId + '/matterport_skybox_images/');
	if (files.length > 0) {
		var skybox_name = files[0].split('_')[0];
		res.json({'image_id': skybox_name, 'status': 0});
	} else {
		res.json({'image_id': null, 'status': 1});
	}
});

app.post('/savePoint', function(req, res) {
	console.log(req.body);
	var status = writeBbox(req.body);
	res.json({'status': status});
});

app.post('/getPoint', function(req, res) {
	var scan = req.body.scan;
	var image_id = req.body.image_id;
	var heading = req.body.heading;
	var elevation = req.body.elevation;
	console.log(heading);
	console.log(elevation)
	var bbox = readBbox(scan, image_id, heading, elevation);
	res.json(bbox);
});

app.listen(7878, function afterListen() {
    console.log('express running on http://localhost:7878');
});