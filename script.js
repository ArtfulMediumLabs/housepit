
let playToggle = document.querySelector("#play-toggle");
let downloadButton = document.querySelector("#download");
let status = document.querySelector("#status");

let elements = document.querySelectorAll("input[type=number]");

for (var i = 0, element; element = elements[i]; i++) {
    element.addEventListener("change", function (event) {
        playToggle.disabled = true;
        downloadButton.disabled = true;
        update();
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
    { file: "2_Bai-ee_Thats_My_Sista.mp3", length: 32, loop: 0 },
    { file: "3_Bai-ee_Thats_My_Sista.mp3", length: 64, loop: 0 },
    { file: "4_Bai-ee_Thats_My_Sista.mp3", length: 32, loop: 0 },
    { file: "5_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 0 },
    { file: "6_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 0 },
    { file: "7_Bai-ee_Thats_My_Sista.mp3", length: 16, loop: 0 },
    { file: "8_Bai-ee_Thats_My_Sista.mp3", length: 8, loop: 1 }
];

const buffers = parts.map(part => new Tone.Buffer({ url: trackDir + part.file }));

Tone.loaded().then(function () {
    status.innerHTML = "Track Loaded"
    enableElements();
    update();
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
        player.buffer = buffer
        makeDownload(buffer.get())
    });

    renderingPromise.then(() => playToggle.disabled = false);
    renderingPromise.then(() => document.querySelector("#download").disabled = false);
}

document.querySelector("#play-toggle").onclick = function () {
    Tone.start();
    if (player.state == "started") {
        player.stop()
    } else {
        player.start()
    }
}

function makeDownload(buffer) {
    var newFile = URL.createObjectURL(bufferToWave(buffer, 0, buffer.length));

    var downloadLink = document.getElementById("download-link");
    downloadLink.href = newFile;
    var name = "Bai-ee_(Thats_My_Sista)_Unreleased.wav"
    downloadLink.download = name;
}