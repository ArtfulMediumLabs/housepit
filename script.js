// http://0.0.0.0:8000/?creator=tz1fNZaC8GHomZFYpEDuHob2u5reJBZsyP9D&viewer=tz1fNZaC8GHomZFYpEDuHob2u5reJBZsyP9D&objkt=135517

const creator = new URLSearchParams(window.location.search).get('creator')
const viewer = new URLSearchParams(window.location.search).get('viewer')
const objkt = new URLSearchParams(window.location.search).get('objkt')
var isOwned = false;

let playToggle = document.querySelector("#play-toggle");
let downloadButton = document.querySelector("#download");
let status = document.querySelector("#status");

let elements = document.querySelectorAll("input[type=number]");

for (var i = 0, element; element = elements[i]; i++) {
    element.addEventListener("change", function (event) {
        playToggle.disabled = true;
        downloadButton.disabled = true;
        update();
        updateDurations();
        render();
    })
}

function enableElements() {
    for (var i = 0, element; element = elements[i]; i++) {
        element.disabled = false
    }
}

const player = new Tone.Player().toDestination();

const trackDir = "";

const parts = [
    { file: "1_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 1 },
    { file: "2_Bai-ee_Thats_My_Sista.mp3", length: 32, loop: 1 },
    { file: "3_Bai-ee_Thats_My_Sista.mp3", length: 64, loop: 1 },
    { file: "4_Bai-ee_Thats_My_Sista.mp3", length: 32, loop: 1 },
    { file: "5_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 1 },
    { file: "6_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 1 },
    { file: "7_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 1 },
    { file: "8_Bai-ee_Thats_My_Sista.mp3", length: 8, loop: 1 }
];

const buffers = parts.map(part => new Tone.Buffer({ url: trackDir + part.file }));

var activeBufferIndex = -1;
var renderedBufferIndex = 99;
var renderedBuffer;

Tone.loaded().then(function () {
    status.innerHTML = "Track Loaded"
    enableElements();
    update();
    updateDurations();
    render();
})

function update() {
    for (var i = 0, element; element = elements[i]; i++) {
        parts[i].loop = element.value;
    }
}

var totalLength = parts.reduce((sum, { length, loop }) => sum + length * loop, 0)

function render() {
    status.innerHTML = "Rendering"
    const renderingPromise = Tone.Offline(({ transport }) => {
        transport.bpm.value = 120;

        var playhead = 0;
        buffers.forEach((buffer, i) => {
            if (parts[i].loop == 0) { return }

            var partPlayer = new Tone.Player(buffer)
            partPlayer.loop = parts[i].loop > 1;
            var loopLength = parts[i].length * parts[i].loop;
            partPlayer.toDestination().sync().start(playhead + "m").stop(playhead + loopLength + "m");
            playhead += loopLength
        });

        transport.start();
    }, Tone.Time(totalLength + "m"))

    renderingPromise.then(buffer => {
        status.innerHTML = "Ready"
        renderedBuffer = buffer
        player.buffer = buffer
        makeDownload(buffer.get())
    });

    renderingPromise.then(() => playToggle.disabled = false);
    renderingPromise.then(() => downloadButton.disabled = !isOwned);
}

function previewPart(index) {
    if (activeBufferIndex != index) {
        player.stop();
        activeBufferIndex = index;
        player.buffer = buffers[index];
    }
    
    if (player.state == "started") {
        player.stop()
    } else {
        player.start();
    }

    updatePlayClass();
}

var now = 0;

playToggle.onclick = function () {
    Tone.start();

    if (activeBufferIndex != renderedBufferIndex) {
        player.stop();
        player.buffer = renderedBuffer;
        activeBufferIndex = renderedBufferIndex;
    }

    if (player.state == "started") {
        player.stop();
        now = -1;
        updateProgressBar(0);
    } else {
        player.start();
        now = Tone.now();
        window.requestAnimationFrame(step);
    }

    updatePlayClass();
}

playToggle.dataset.index = renderedBufferIndex;

function updatePlayClass() {
    const isPlaying = player.state == "started"

    var previewElements = document.querySelectorAll(".preview, #play-toggle");
    
    for (var i = 0, element; element = previewElements[i]; i++) {
        if (element.dataset.index == activeBufferIndex && isPlaying) {
            element.classList.remove("play")
            element.classList.add("stop")
        } else {
            element.classList.remove("stop")
            element.classList.add("play")
        }

    }
}

function updateDurations() {
    var durationElements = document.querySelectorAll(".previewDuration");
    
    for (var i = 0, element; element = durationElements[i]; i++) {
        let index = element.dataset.index;
        let duration = previewDuration(index);
        element.innerHTML = formatDuration(duration);
    }

    let totalDurationElement = document.getElementById("totalDuration");
    let totalDuration = trackDuration();
    totalDurationElement.innerHTML = formatDuration(totalDuration);

}

function previewDuration(index) {
    let duration = buffers[index].duration * parseInt(parts[index].loop);
    return duration
}

function trackDuration() {
    return parts.reduce((sum, { loop }, index) => sum + buffers[index].duration * loop, 0)
}

function formatDuration(duration) {
    let minutes = Math.floor(duration / 60);
    let seconds = Math.floor(duration - (minutes * 60));
    if (seconds < 10) { seconds = "0" + seconds; }
    return minutes + ":" + seconds;
}

function step(timestamp) {
    if (now < 0) { return; }
    if (activeBufferIndex != renderedBufferIndex) { return; }

    let seconds = Tone.now() - now;
    let progress = seconds/renderedBuffer.duration;

    updateProgressBar(progress);

    if (now <= 1) {
      window.requestAnimationFrame(step);
    }
}

function updateProgressBar(progress) {
    let progressBar = document.getElementById("progress")
    let width = Math.floor(progress * 300);
    progressBar.style.width = width + 'px';
}

function makeDownload(buffer) {
    var newFile = URL.createObjectURL(bufferToWave(buffer, 0, buffer.length));

    var downloadLink = document.getElementById("download-link");
    downloadLink.href = newFile;
    var name = "Bai-ee_(Thats_My_Sista)_Unreleased.wav"
    downloadLink.download = name;
}

function validateToken(viewer, objkt){
    const url = 'https://api.tzkt.io/v1/bigmaps/511/keys?key.address=' + viewer + '&key.nat=' + objkt + '&select=value';
    axios.get(url)
    .then(result => {
        let count = result.data ?? [];
        isOwned = count.length > 0;
        downloadButton.disabled == !playToggle.disabled && !isOwned;
    })
    .catch(err => console.log('error', err));
}

validateToken(viewer, objkt);