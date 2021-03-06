const hostname = window.location.hostname;
const url = 'http://' + hostname + ':3000';

const socket = io.connect(url);

const live = document.querySelector('.live');
const record = document.querySelector('.record');
const video = document.querySelector('.video');
let recording = false;
let livestream = true;

const addError = text => {
	const errorContainer = document.querySelector('.errors');
	const error = document.createElement('h3');
	error.classList.add('error');
	error.innerText = text;
	errorContainer.appendChild(error);
	const interval = setInterval(() => {
		errorContainer.removeChild(error);
		clearInterval(interval);
	}, 1000);
};

const uint8ToBase64 = buffer => {
	let t = "";
	let n = new Uint8Array(buffer);
	let r = n.byteLength;
	for(let i = 0;i < r;i++){
        	t += String.fromCharCode(n[i]);
	}
	return window.btoa(t);
};

window.addEventListener('load', async(e) => {
	const res = await fetch(`${url}/state`);
	const data = await res.json();
	const recState = data.rec;
	const liveState = data.live;
	const cameraState = data.cam;
	if(recState == 1) {
		recording = true;
		record.innerText = 'Stop recording';
	}
	if(liveState == 0) {
		livestream = false;
		live.innerText = 'Start livestream';
	}
	if(cameraState == 0) {
		addError('Please plug in the camera and restart the pi !');
	}
});

live.addEventListener('click', async(e) => {
	livestream = !livestream;
	let state = livestream == true ? 1 : 0;
	const res = await fetch(`${url}/live`, {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
      		'Content-Type': 'application/json'
		},
		body: JSON.stringify({ "data" : state })
	});
	const data = await res.json();
	if(data.error) {
		livestream = !livestream;
		console.log(data.error);
		addError(data.error);
	} else {
		live.innerText = data.buttonData;
	}
});

record.addEventListener('click', async(e) => {
	recording = !recording;
	let state = recording == true ? 1 : 0;
	const res = await fetch(`${url}/rec`, {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
      		'Content-Type': 'application/json'
		},
		body: JSON.stringify({ "data" : state })
	});
	const data = await res.json();
	if(data.error) {
		recording = !recording;
		console.log(data.error);
		addError(data.error);
	} else {
		record.innerText = data.buttonData;
	}
});

video.addEventListener('click', async(e) => {
	video.disable = true;
	video.innerText = 'Making videos...'
	const res = await fetch(`${url}/vid`);
	const data = await res.json();
	if(data.error) {
		console.log(data.error);
		addError(data.error);
	} else {
		console.log(data.res);
	}
	video.disable = false;
	video.innerText = "Start video synthesis";
});

if(livestream) {
	socket.on('buffer', data => {
		const image = document.querySelector('.image');
		const img = uint8ToBase64(data);
		image.src = `data:image/jpeg;base64,${img}`;
	});
}