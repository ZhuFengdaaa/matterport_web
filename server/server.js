var express = require('express');
var fs = require('fs');
var image = require("imageinfo");
var bodyParser = require('body-parser');
var lineByLine = require('n-readlines');

var app = express();

app.use(bodyParser.json({limit: '10mb'}));  //body-parser 解析json格式数据
app.use(bodyParser.urlencoded({            //此项必须在 bodyParser.json 下面,为参数编码
  extended: true
}));

//设置允许跨域访问该服务.
app.all('*', function (req, res, next) {
	splits = req.originalUrl.split(".")
	console.log(splits)
	if (splits.length > 1)
	{
		
		tail = splits[splits.length-1]
		console.log(tail)
		if (tail == "html")
		{
			res.type('.html');
		}
		else if(tail == "js")
		{
			console.log("res.type('.js');")
			res.type('.js');
		}
		else if(tail == "css")
		{
			res.set('Content-Type', 'text/css')
		}
		else if(tail == "json")
		{
			res.header('Access-Control-Allow-Origin', '*');
			//Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行
			res.header('Access-Control-Allow-Headers', 'Content-Type');
			res.header('Access-Control-Allow-Methods', '*');
			res.header('Content-Type', 'application/json;charset=utf-8');
		}
	}
	// console.log(req.is('html'))
	// if(req.is('html'))
	// {
	// 	// res.set('Content-Type', 'text/html')
	// 	res.header('Content-Type', 'text/html')
	// }
   else if (splits.length == 1)
   {
	res.header('Access-Control-Allow-Origin', '*');
	//Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	res.header('Access-Control-Allow-Methods', '*');
	res.header('Content-Type', 'application/json;charset=utf-8');
   }
  
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
	ret_bboxes = [];
	for (var i in bboxes) {
		var bbox = bboxes[i];
        // if (bbox['scan'] == scan && bbox['image_id'] == image_id && Math.abs(bbox['heading'] - heading) < 0.01 && Math.abs(bbox['elevation'] - elevation) < 0.0001){
        if (bbox['scan'] == scan && bbox['image_id'] == image_id){
			ret_bboxes.push(bbox);
		}
	}
	return ret_bboxes;
}

function readBboxByImage(scan, image_id) {
	var data = fs.readFileSync('../app/bbox/' + scan + '_boundingbox.json');
	var bboxes = data.toString();
	bboxes = JSON.parse(bboxes);
	for (var i in bboxes) {
		var bbox = bboxes[i];
		if (bbox['scan'] == scan && bbox['image_id'] == image_id){
			return bbox;
		}
	}
	return null;
}

function writeInstr(params, userName) {
	instr_path = '../app/' + userName + '/' + params.scan + '_instructions.json';
	if (!fs.existsSync(instr_path)) {
    	fs.writeFileSync(instr_path, '[]')
    }
    var data = fs.readFileSync(instr_path);
    var instr = data.toString();
    instr = JSON.parse(instr);
    instr.push(params);
    var str = JSON.stringify(instr);
    fs.writeFileSync(instr_path,str);
    console.log('----------write success-------------');
    return true;
}

function mkdirUser(userName) {
	dir = '../app/' + userName;
	if(!fs.existsSync(dir))
		fs.mkdirSync('../app/' + userName);
	return true;
}

function readFileToArr(fReadName) {

    var arr = [];
    liner = new lineByLine(fReadName);
    while (line = liner.next()) {
    	arr.push(line.toString('ascii'));
    }
    console.log(arr);
    return arr;
}

// 删除数组中的元素
function del(arr,num) {
	var l=arr.length;
    for (var i = 0; i < l; i++) {
	  	if (arr[0]!==num) { 
	  		arr.push(arr[0]);
	  	}
	  	arr.shift(arr[0]);
    }
    return arr;
}

function getUserBbox(userName) {
	user_path = '../app/bbox/user.txt';
	scans_path = '../app/bbox/scans.txt';
	var users_data = fs.readFileSync(user_path);
	var users = users_data.toString();
	users = JSON.parse(users);
	var users_len = users.length;
	var user_anno;
	arr = readFileToArr(scans_path);
	console.log(arr.length);

	for (var i in users) {
		var u = users[i];
		if(u['user_name'] == userName) {
			return u;
		} else if (i <= 21) {
			arr = del(arr, u['scans'][0]);
			arr = del(arr, u['scans'][1]);
			arr = del(arr, u['scans'][2]);
			arr = del(arr, u['scans'][3]);
		} else if (i == 22) {
			arr = del(arr, u['scans'][0]);
			arr = del(arr, u['scans'][1]);
			arr = del(arr, u['scans'][2]);
		}
	}
	console.log(arr)
	
	// 22人标注，前21人没人标注4个，最后一人标注3个
	var wrightperson = true;
	if (users_len < 21) {
		user_anno = {
			"id": users_len,
			"user_name": userName,
			"scans": [
				arr[0], arr[1], arr[2], arr[3]
			]
		}
	} else if (users_len == 21) {
		user_anno = {
			"id": users_len,
			"user_name": userName,
			"scans": [
				arr[0], arr[1], arr[2]
			]
		}
	} else {
		wrightperson = false;
	}
	if (wrightperson) {
		users.push(user_anno);
		var str = JSON.stringify(users);
	    fs.writeFileSync(user_path, str);
	} else {
		user_anno = null;
	}
	return user_anno;
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

app.post('/getPointByImage', function(req, res) {
	var scan = req.body.scan;
	var image_id = req.body.image_id;
	var bbox = readBboxByImage(scan, image_id);
	res.json(bbox);
})

app.post('/saveInstruction/:userName', function(req, res) {
	console.log(req.params.userName)
	console.log(req.body);
	var status = writeInstr(req.body, req.params.userName);
	res.json({'status': status});
})

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.get('/index.html', function(req, res){
	res.render('index.html')
})

app.get('/trajectory.html', function(req, res){
	res.render('trajectory.html')
})

app.use(express.static('public'))

// used for collecting instructions
app.get('/user/:userName', function(req, res) {
	var status = mkdirUser(req.params.userName);
	res.json({'status': status});
})

app.get('/userBbox/:userName', function(req, res) {
	var user_anno = getUserBbox(req.params.userName);
	res.json(user_anno);
})

app.listen(3000, function afterListen() {
    console.log('express running on http://localhost:3000');
});