const createLinkContainer = (url, videoName) => {
    const li = document.createElement("li");
    li.classList.add("link_container");
    li.classList.add("flex");

    const text = document.createElement("p");
    text.classList.add("file_name");
    const fileName = document.createTextNode(videoName);
    text.appendChild(fileName);

    const downloadButton = document.createElement("button");
    downloadButton.classList.add("download");

    const downloadAnchor = document.createElement("a");
    downloadAnchor.classList.add("file_link");
    downloadAnchor.href = `${url}/download/${videoName}`;
    downloadAnchor.download = videoName;
    
    const downloadButtonText = document.createTextNode("Download");
    downloadAnchor.appendChild(downloadButtonText);

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete");
    const deleteButtonText = document.createTextNode("Delete");
    deleteButton.appendChild(deleteButtonText);

    li.appendChild(text);
    downloadButton.appendChild(downloadAnchor);
    li.appendChild(downloadButton);
    li.appendChild(deleteButton);

    return li;
};
const hostname = window.location.hostname;
const url = 'http://' + hostname + ':3000';
const container = document.querySelector('.container');
window.addEventListener('load', async (e) => {
    try {
        const res = await fetch(`${url}/videoList`);
        const json = await res.json();
        if(json.error) {
            const body = document.querySelector('body');
            const ol = document.querySelector('ol');
            const h2 = document.createElement('h2');
            h2.innerText = json.error;
            body.insertBefore(h2, ol);
        } else {
            const { files } = json;
            files.forEach(file => {
                const elem = createLinkContainer(url, file);
                container.appendChild(elem);
            });
            const deleteButton = document.getElementsByClassName('delete');
            for(let i = 0; i < deleteButton.length; i++) {
                deleteButton[i].addEventListener('click', async(e) => {
                    const parentElement = e.path[1];
                    const fileName = parentElement.firstChild.innerText;
                    try {
                        const res = await fetch(`${url}/delete/${fileName}`, {
                            method: 'DELETE',
                        });
                        const data = await res.json();
                        if(data.error) {
                            console.log(data.error);
                        } else {
                            container.removeChild(parentElement);
                            console.log(data.res);
                        }
                    } catch (err) {
                        console.log(err);
                    }
                });
            }
        }
        
    } catch (err) {
        console.log(err);
    }
});