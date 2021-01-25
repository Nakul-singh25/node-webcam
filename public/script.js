const uint8ToBase64 = (buffer) => {
	var t="";
	var n=new Uint8Array(buffer);
	var r=n.byteLength;
	for(var i=0;i<r;i++){
        	t+=String.fromCharCode(n[i])
	}
	return window.btoa(t)
};

const hostname = window.location.hostname;
const socket = io.connect('http://' + hostname + ':3000');

socket.on('buffer', (data) => {
	const image = document.querySelector('.image');
	const inflated_data = pako.inflate(data);
	const img = uint8ToBase64(inflated_data);
	image.src = `data:image/jpeg;base64,${img}`;
});
