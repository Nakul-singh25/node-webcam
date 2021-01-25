const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const zlib = require('zlib');
const cv = require('opencv4nodejs');
const ffmpeg = require('fluent-ffmpeg');
const Gpio = require('onoff').Gpio;
const date = require('date-and-time');
const Promise = require('bluebird');
const ip = require('ip');

const recordButton = new Gpio(17, 'in', 'both');
const videoButton = new Gpio(27, 'in', 'both');
const recordLed = new Gpio(22, 'out');
const videoLed = new Gpio(10, 'out');

const FPS = 12;
let counter = 0;
let recordState;
let dirName;

const mkDir = name => {
	if(!fs.existsSync(path.join(__dirname, name))) {
		fs.mkdir(path.join(__dirname, name), err => {
         	if(err) {
            		console.log(err);
        	} else {
				console.log(name, ' dir created!');
            }
		});
	}
};

const promisifyCommand = command => {
    return Promise.promisify( (cb) => {
        command
        .on( 'end', () => {
		cb(null);
	})
        .on( 'error', (error) => { cb(error) } )
        .run()
    })
};

app.use(express.static('public'));

try {
	const vCap = new cv.VideoCapture(0);
	vCap.set(cv.CAP_PROP_BUFFERSIZE, 1);

	setInterval(() => {
		const frame = vCap.read();
		const flippedFrame = frame.flip(1);
		const resizedFrame = flippedFrame.resize(frame.rows/4, frame.cols/4);
		const grayFrame = resizedFrame.cvtColor(cv.COLOR_BGR2GRAY);
		const image = cv.imencode('.jpg', flippedFrame);
		const resizedImage = cv.imencode('.jpg', grayFrame);
		// const resizedImage = cv.imencode('.jpg', resizedFrame);
		const base64str = image.toString('base64');
	
		if(recordState === true) {
			mkDir('images');
			if(counter < 1) {
				const now = new Date();
				dirName = 'Img ' + date.format(now, 'YYYY/MM/DD HH:mm:ss').split('/').join('-');
				mkDir('images/' + dirName);
			}
			const fileName = 'img' + counter.toString() + '.jpg';
			try {
				fs.writeFileSync(path.join(__dirname, 'images/' + dirName, fileName), base64str, 'base64');
			} catch(err) {
				console.log(err);
			}
			   counter += 1;
		}
	
		zlib.deflate(resizedImage, (err, buffer) => {
			if(!err) {
				io.emit('buffer', buffer);
			} else {
				console.log(err);
			}
		});
	}, 1000 / FPS);
	
	recordButton.watch((err, value) => {
			if(value == 1) {
				recordLed.writeSync(1);
				recordState = true;
				console.log('Recording started...');
			} else {
				recordLed.writeSync(0);
				recordState = false;
				counter = 0;
				console.log('Recording stopped!');
			}
	});
	
	videoButton.watch((err, value) => {
		if(value == 0) {
			try {
				const dirs = fs.readdirSync(path.join(__dirname, 'images'));
				videoLed.writeSync(1);
				console.log('Started making video...');
				mkDir("video");
				const numDirs = dirs.length;
				let counter = 0;
				dirs.forEach(file => {
					let command = ffmpeg()
							.input('images/' + file  + '/img%d.jpg')
							.inputFPS(FPS)
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
								videoLed.writeSync(0);
							}
						})
						.catch(error => {
							counter += 1;
							console.log(error);
						});
				});
			} catch(err) {
				videoLed.writeSync(0);
				console.log('First record the video!')
			}
		}
	});
	
} catch(err) {
	console.log(err);
}

server.listen(3000, () => {
	console.log(`Listening at ${ip.address() + ':3000'}`);
});