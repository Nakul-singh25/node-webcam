const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cv = require('opencv4nodejs');
const ffmpeg = require('fluent-ffmpeg');
const Promise = require('bluebird');

const FPS = 12;
let counter = 0;
let recordState = false;
let liveState = true; 
let cameraState = false;
let dirName;

const mkDir = name => {
	if(!fs.existsSync(path.join(__dirname, name))) {
		try {
			fs.mkdirSync(path.join(__dirname, name)); 
			console.log(name, ' dir created!');
		} catch(err) {
            	console.log(err);
		}
	}
};

const promisifyCommand = command => {
    return Promise.promisify(cb => {
        command
        .on('end', () => {
			cb(null);
		})
        .on('error', (error) => { 
			cb(error); 
		})
        .run()
    })
};

app.use(express.static('public'));
app.use(express.json());

app.get('/state', (req, res) => {
	let state1 = liveState === true? 1 : 0;
	let state2 = recordState === true? 1 : 0;
	let state3 = cameraState === true? 1 : 0;
	res.json({'live' : state1, 'rec' : state2, 'cam' : state3 });
});

app.post('/live', (req, res) => {
	let data = req.body.data;
	if (data == 1) {
		liveState = true;
		console.log('Livestream started...');
		res.json({'res' : 'Livestream started', 'buttonData': 'Stop livestream'});
	} else if (data == 0) {
		liveState = false;
		counter = 0;
		console.log('Livestream stopped!');
		res.json({'res' : 'Livestream stopped!', 'buttonData': 'Start livestream'});
	} else {
		res.json({'error' : 'Wrong data!'});
	}
});

app.post('/rec', (req, res) => {
	let data = req.body.data;
	if (data == 1) {
		recordState = true;
		console.log('Recording started...');
		res.json({'res' : 'Recording started', 'buttonData': 'Stop recording'});
	} else if (data == 0) {
		recordState = false;
		counter = 0;
		console.log('Recording stopped!');
		res.json({'res' : 'Recording stopped!', 'buttonData': 'Start recording'});
	} else {
		res.json({'error' : 'Wrong data!'});
	}
});

app.get('/vid', (req, res) => {
	try {
		const dirs = fs.readdirSync(path.join(__dirname, 'images'));
		console.log('Started making video...');
		mkDir("video");
		const numDirs = dirs.length;
		let counter = 0;
		dirs.forEach(file => {
			let command = ffmpeg()
					.input('images/' + file  + '/img%d.jpg')
					.inputFPS(FPS - 1)
					.output('video/' + file  + '.mp4')
					.noAudio();
			command = promisifyCommand(command);
			console.log(file + ' started!');
			command()
				.then(() => {
					counter += 1;
					console.log(file + ' completed!');
					if (counter == numDirs) {
						fs.rmdirSync(path.join(__dirname, 'images'), { recursive: true });
						console.log('All videos Completeed!');
						console.log('images dir deleted!');
						res.json({'res' : 'vid synthesis completed completed!'});
					}
				})
				.catch(error => {
					counter += 1;
					console.log(error);
					res.json({ error });
				});
		});
	} catch(err) {
		console.log('First record the video!');
		res.json({'error' : 'First record the video!'});
	}
});

app.get('/videoList', (req, res) => {
	try {
		const files = fs.readdirSync(path.join(__dirname, 'video'));
		if(files.length > 0) {
			res.json({ files });
		} else {
			res.json({"error" : "No videos!"});
		}
	} catch (err) {
		res.json({"error" : "No videos!"});
	}
});

app.get('/download/:file(*)', (req, res) => {
	let file = req.params.file;
	let fileLocation = path.join(__dirname, 'video', file);
	res.download(fileLocation, file);
});

app.delete('/delete/:file(*)', (req, res) => {
	let file = req.params.file;
	console.log(file, ' deleted!');
	let fileLocation = path.join(__dirname, 'video', file);
	try {
		fs.unlinkSync(fileLocation);
		res.json({'res' : `${file} deleted!`});
	} catch (err) {
		res.json({'error' : err});
		console.log(err);
	}
})

try {
	const vCap = new cv.VideoCapture(0);
	vCap.set(cv.CAP_PROP_BUFFERSIZE, 1);

	cameraState = true;

	const interval = setInterval(() => {
		try {
			const frame = vCap.read();
			const flippedFrame = frame.flip(1);
			const resizedFrame = flippedFrame.resize(frame.rows/5, frame.cols/5);
			const grayFrame = resizedFrame.cvtColor(cv.COLOR_BGR2GRAY);
			const image = cv.imencode('.jpg', flippedFrame);
			const resizedImage = cv.imencode('.jpg', grayFrame);
			// const resizedImage = cv.imencode('.jpg', resizedFrame);
			const base64str = image.toString('base64');

			if(recordState === true) {
				mkDir('images');
				if(counter < 1) {
					const now = Date.now();
					dirName = `Img${now}`;
					mkDir('images/' + dirName);
				}
				const fileName = 'img' + counter.toString() + '.jpg';
				const filePath = path.join(__dirname, 'images', dirName, fileName);
				if(fs.existsSync(path.join(__dirname, 'images', dirName))) {
					try {
						fs.writeFileSync(filePath, base64str, 'base64');
					} catch(err) {
						console.log(err);
					}
				}
				counter += 1;
			}
			if (liveState === true) {
			io.emit('buffer', resizedImage);
			}
		} catch(err) {
			cameraState = false;
			console.log("Camera is plugged out!");
			clearInterval(interval);
		}
	}, 1000 / FPS);
} catch(err) {
	console.log("Please plug in the camera!");
	cameraState = false;
}

server.listen(3000, () => {
	console.log('Listening at port 3000');
});