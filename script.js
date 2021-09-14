// http://0.0.0.0:8000/?creator=tz1fNZaC8GHomZFYpEDuHob2u5reJBZsyP9D&viewer=tz1fNZaC8GHomZFYpEDuHob2u5reJBZsyP9D&objkt=135517

const creator = new URLSearchParams(window.location.search).get('creator')
const viewer = new URLSearchParams(window.location.search).get('viewer')
const objkt = new URLSearchParams(window.location.search).get('objkt')
var isOwned = false;

let playToggle = document.querySelector("#play-toggle");
let downloadButton = document.querySelector("#download");
let status = document.querySelector("#status");

let elements = document.querySelectorAll(".box input[type=number]");

for (var i = 0, element; element = elements[i]; i++) {
    element.addEventListener("change", function (event) {
        Tone.Transport.stop();
        updateParts();
        updateDurations();
        schedulePlayers();
        updatePlayClass();
    })
}

function enableElements() {
    for (var i = 0, element; element = elements[i]; i++) {
        element.disabled = false
    }
}

let trackRepeatElement = document.getElementById("trackRepeat");
var trackRepeat = trackRepeatElement.value;

trackRepeatElement.addEventListener("change", function(event) {
    Tone.Transport.stop();

    trackRepeat = trackRepeatElement.value;

    updateDurations();
    schedulePlayers();
})

const player = new Tone.Player().toDestination();
player.loop = true;


const buffers = parts.map(part => new Tone.Buffer({ url: trackDir + part.file }));

var activeBufferIndex = -1;
var renderedBufferIndex = 99;

Tone.loaded().then(function () {
    status.innerHTML = "Track Loaded"
    playToggle.disabled = false;
    enableElements();
    updateParts();
    updateDurations();
    schedulePlayers();
});

function updateParts() {
    for (var i = 0, element; element = elements[i]; i++) {
        parts[i].loop = element.value;
    }
}

function render() {
    status.innerHTML = "Rendering"
    const renderingPromise = Tone.Offline(({ transport }) => {
        transport.bpm.value = bpm;

        var playhead = 0;

        for (var i=0; i<trackRepeat; i++) {
            buffers.forEach((buffer, i) => {
                if (parts[i].loop == 0) { return }

                var partPlayer = new Tone.Player(buffer)
                partPlayer.loop = parts[i].loop > 1;
                var loopLength = parts[i].length * parts[i].loop;
                partPlayer.toDestination().sync().start(playhead + "m").stop(playhead + loopLength + "m");
                playhead += loopLength
            });
        }

        transport.start();
    }, Tone.Time(totalLength()))

    renderingPromise.then(buffer => {
        status.innerHTML = "Ready to Download"
        makeDownload(buffer.get())
    });

    renderingPromise.then(() => {
        var downloadLink = document.getElementById("download-link");
        downloadLink.click();
    });
}


Tone.Transport.bpm.value = bpm;

var players = buffers.map((buffer, i) => {
    var partPlayer = new Tone.Player(buffer)
    partPlayer.loop = parts[i].loop > 1;
    partPlayer.toDestination().sync()
    return partPlayer;
});

function schedulePlayers() {
    players.forEach((partPlayer) => {partPlayer.unsync(); partPlayer.sync()});
    var playhead = 0;
    for (var i=0; i<trackRepeat; i++) {
        players.forEach((partPlayer, i) => {
            if (parts[i].loop == 0) { 
                return;
            }

            partPlayer.loop = parts[i].loop > 1;
            var loopLength = parts[i].length * parts[i].loop;
            partPlayer.start(playhead + "m").stop(playhead + loopLength + "m");
            playhead += loopLength
        }); 
    }   
}

var playerStartTime = 0;
var previewProgressElement;

function previewPart(index, element) {
    if (Tone.Transport.state == "started") {
        Tone.Transport.stop();
    }

    if (activeBufferIndex != index) {
        player.stop();
        activeBufferIndex = index;
        player.buffer = buffers[index];
    }
    
    if (player.state == "started") {
        playerStartTime = 0;
        player.stop()
    } else {
        playerStartTime = Tone.now();
        previewProgressElement = element;
        player.start();
    }

    resetPreviewProgress();
    updatePlayClass();
}

function resetPreviewProgress(index) {
    var durationElements = document.querySelectorAll(".previewProgress");
    
    for (var i = 0, element; element = durationElements[i]; i++) {
        element.style.width = 0;
    }
}

function previewProgress() {
    if (playerStartTime == 0 || player.state == "stopped") {
        return 0;
    }
    return (Tone.now() - playerStartTime) % player.buffer.duration / player.buffer.duration;
}

playToggle.onclick = function () {
    Tone.start();

    if (activeBufferIndex != renderedBufferIndex) {
        activeBufferIndex = renderedBufferIndex;
        playerStartTime = 0;
        player.stop();
        resetPreviewProgress();
    }

    if (Tone.Transport.state == "started") {
        Tone.Transport.stop();
    } else {
        Tone.Transport.start()
        Tone.Transport.scheduleOnce(autoStop, '+' + totalLength());
    }

    updatePlayClass();
}

autoStop = function() {
    Tone.Transport.stop();
    updatePlayClass();
}

playToggle.dataset.index = renderedBufferIndex;

function updatePlayClass() {
    const isPlaying = Tone.Transport.state == "started" || player.state == "started";

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

    let totalDurationElement = document.querySelector("#totalDuration");
    let totalDuration = trackDuration();
    totalDurationElement.innerHTML = formatDuration(totalDuration);

}

function previewDuration(index) {
    let duration = buffers[index].duration * parseInt(parts[index].loop);
    return duration
}

function trackDuration() {
    return parts.reduce((sum, { loop }, index) => sum + buffers[index].duration * loop, 0) * trackRepeat;
}

function trackLoopLength() {
    return parts.reduce((sum, { length, loop }) => sum + length * loop, 0) + 'm';
}

function totalLength() {
    return parts.reduce((sum, { length, loop }) => sum + length * loop, 0) * trackRepeat + 'm';
}

function formatDuration(duration) {
    let minutes = Math.floor(duration / 60);
    let seconds = Math.floor(duration - (minutes * 60));
    if (seconds < 10) { seconds = "0" + seconds; }
    return minutes + ":" + seconds;
}

downloadButton.onclick = function () {
    render();
}

function makeDownload(buffer) {
    var newFile = URL.createObjectURL(bufferToWave(buffer, 0, buffer.length));

    var downloadLink = document.getElementById("download-link");
    downloadLink.href = newFile;
    downloadLink.download = downloadName;
}

function validateToken(viewer, objkt){
    const url = 'https://api.tzkt.io/v1/bigmaps/511/keys?key.address=' + viewer + '&key.nat=' + objkt + '&select=value';
    axios.get(url)
    .then(result => {
        let count = result.data ?? [];
        isOwned = count.length > 0;
        downloadButton.disabled = !isOwned;
    })
    .catch(err => console.log('error', err));
}

setInterval(() => {
    const progress = Tone.Transport.ticks / Tone.Time(totalLength()).toTicks();
    const width = Math.floor(progress * 300);
    document.getElementById("progress").style.width = width + 'px';

    if (playerStartTime > 0) {
        const previewWidth = Math.floor(previewProgress() * 100);
        previewProgressElement.style.width = previewWidth + 'px';
    }
    

}, 16);

validateToken(viewer, objkt);