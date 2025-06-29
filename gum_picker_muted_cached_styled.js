video.volume = 0.1;
camOn.checked = micOn.checked = false;
const defaultSpeakerLabel = "Default system output";

if (!localStorage.speakersLabel) {
  localStorage.speakersLabel = defaultSpeakerLabel;
}

async function enumerateDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  let videos = devices.filter(({kind}) => kind.includes("video"));
  let audios = devices.filter(({kind}) => kind.includes("audio"));

  if (audios.reduce((s, {label}) => s + label, "")) {
    localStorage.cachedAudios = JSON.stringify(audios);
  } else if (localStorage.cachedAudios) {
    audios = JSON.parse(localStorage.cachedAudios);
  }
  if (videos.reduce((s, {label}) => s + label, "")) {
    localStorage.cachedVideos = JSON.stringify(videos);
  } else if (localStorage.cachedVideos) {
    videos = JSON.parse(localStorage.cachedVideos);
  }
  return audios.concat(videos);
}

async function getUserMedia(constraints) {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  for (const track of stream.getTracks()) {
    localStorage[track.kind] = track.getSettings().deviceId;
    localStorage[track.kind + "Label"] = track.label;
    const on = (track.kind == "video")? camOn : micOn;
    track.enabled = on.checked;
  }
  return stream;
}

async function setSinkId(deviceId, label = defaultSpeakerLabel) {
  if (deviceId == video.sinkId) return;
  await video.setSinkId((deviceId == "default")? "" : deviceId);
  localStorage.speakers = deviceId;
  localStorage.speakersLabel = label;
}

camOn.onclick = async () => {
  try {
    if (camOn.checked && !video.srcObject?.getVideoTracks().length) {
      const stream = await getUserMedia({video: {deviceId: localStorage.video}});
      video.srcObject = new MediaStream([stream.getVideoTracks()[0], ...(video.srcObject?.getAudioTracks() || [])]);
    }
    const track = video.srcObject?.getVideoTracks()?.[0];
    if (track) track.enabled = camOn.checked;
  } catch (e) {
    console.log(e);
  } finally {
    await updateSelectors();
  }
};

micOn.onclick = async () => {
  try {
    if (micOn.checked && !video.srcObject?.getAudioTracks().length) {
      const stream = spectrum(await getUserMedia({audio: {deviceId: localStorage.audio}}));
      if (localStorage.speakers) {
        await setSinkId(localStorage.speakers, localStorage.speakersLabel);
      }
      video.srcObject = new MediaStream([stream.getAudioTracks()[0], ...(video.srcObject?.getVideoTracks() || [])]);
    }
    const track = video.srcObject?.getAudioTracks()?.[0];
    if (track) track.enabled = micOn.checked;
  } catch (e) {
    console.log(e);
  } finally {
    await updateSelectors();
  }
};

halt.onclick = () => {
  for (const track of video.srcObject?.getTracks() || []) {
    track.stop();
  }
  video.srcObject = null;
  camOn.checked = micOn.checked = false;
  camOn.onchange();
  micOn.onchange();
  div.innerHTML = "";
}

/* helper to map ON → icon , OFF → icon-slash */
function setIcon(toggleEl, iconEl, base) {
  iconEl.className = `fa-solid ${base}${toggleEl.checked ? '' : '-slash'}`;
}

setIcon(camOn, camIcon, 'fa-video');
setIcon(micOn, micIcon, 'fa-microphone');
camOn.onchange = () => setIcon(camOn, camIcon, 'fa-video');
micOn.onchange = () => setIcon(micOn, micIcon, 'fa-microphone');

async function replaceUserMedia(constraints, ...oldTracks) {
  try {
    const stream = await getUserMedia(constraints);
    for (const track of oldTracks) {
      track?.stop();
    }
    return stream;
  } catch (e) {
    if (e.name != "NotReadableError") throw e;
    for (const track of oldTracks) {
      track?.stop();
    }
    return await getUserMedia(constraints);
  }
}

microphone.onchange = async () => {
  try {
    const [oldTrack] = video.srcObject?.getAudioTracks() || [];
    if (!oldTrack) {
      localStorage.audio = microphone.value;
      localStorage.audioLabel = microphone.options[microphone.selectedIndex].text;
      return;
    }
    const [newTrack] = (await replaceUserMedia({audio: {deviceId: {exact: microphone.value}}}, oldTrack)).getAudioTracks();
    video.srcObject = spectrum(new MediaStream([newTrack, ...video.srcObject.getVideoTracks()]));
  } catch (e) {
    console.log(e);
    await updateSelectors();
  }
};

camera.onchange = async () => {
  try {
    const [oldTrack] = video.srcObject?.getVideoTracks() || [];
    if (!oldTrack) {
      localStorage.video = camera.value;
      localStorage.videoLabel = camera.options[camera.selectedIndex].text;
      return;
    }
    const [newTrack] = (await replaceUserMedia({video: {deviceId: {exact: camera.value}}}, oldTrack)).getVideoTracks();
    video.srcObject = new MediaStream([newTrack, ...video.srcObject.getAudioTracks()]);
  } catch (e) {
    console.log(e);
    await updateSelectors();
  }
};

async function resetSpeakers() {
  try {
    await setSinkId("");
    speakers.value = [...speakers.options].find(({value}) => value == "default")? "default" : "";
  } catch (e) {
    console.log(e);
  }
};

speakers.onchange = async () => {
  try {
    let label = "", deviceId = speakers.value;

    for (const option of speakers.options) {
      if (speakers.value == option.value) label = option.innerText;
    }
    localStorage.speakers = deviceId;
    localStorage.speakersLabel = label;
    if (!video.srcObject?.getAudioTracks().length) return;
    await setSinkId(deviceId, label);
  } catch (e) {
    console.log(e);
  } finally {
    await updateSelectors();
  }
};

navigator.mediaDevices.ondevicechange = async () => {
  try {
    const devices = await enumerateDevices();
    if (!devices.find(({deviceId}) => deviceId == video.sinkId)) {
      resetSpeakers();
    }
    await updateSelectors();
  } catch (e) {
    console.log(e);
  }
}

async function updateSelectors() {
  try {
    const selectedIds = (video.srcObject?.getTracks() || []).map(t => t.getSettings().deviceId);
    if (video.sinkId) {
      selectedIds.push(video.sinkId);
    }
    const devices = await enumerateDevices();

    for (const [s, type, kind, name] of [[camera, "video", "videoinput", "Camera"],
                                         [microphone, "audio", "audioinput", "Microphone"],
                                         [speakers, "speakers", "audiooutput", "Speakers"]]) {
      let old = s.value;
      while (s.firstChild) s.removeChild(s.firstChild);
      let i = 0;
      for (const device of devices) {
        if (device.kind != kind) continue;
        const option = document.createElement('option');
        option.value = device.deviceId;
        i++;
        const match = device.deviceId == localStorage[type];
        option.text = device.label || (match && localStorage[type+"Label"]) || `${name} ${i}`;
        if (match) old = option.value;
        s.appendChild(option);
      }
      if (kind == "audiooutput") {
        if (!speakers.options.length || speakers.options[0].value != "default") {
          const option = document.createElement('option');
          option.value = "";
          option.text = defaultSpeakerLabel;
          speakers.insertBefore(option, speakers.options[0]);
        }
        if (!speakers.options.length && localStorage.speakers?.length) {
          const option = document.createElement('option');
          option.value = localStorage.speakers;
          option.text = localStorage.speakersLabel;
          speakers.appendChild(option);
          speakers.value = option.value;
        }
      }
      if ([...s.options].map(({value}) => value).includes(old)) s.value = old;
      for (const option of s.options) {
        if (selectedIds.includes(option.value)) s.value = option.value;
      }
    }
  } catch (e) {
    console.log(e);
  }
}
updateSelectors();

function spectrum(stream) {
  const audioCtx = new AudioContext();
  const analyser = audioCtx.createAnalyser();
  audioCtx.createMediaStreamSource(stream).connect(analyser);
  const ctx = canvas.getContext("2d");
  const data = new Uint8Array(canvas.width);
  ctx.strokeStyle = 'rgb(0, 125, 0)';

  const interval = setInterval(() => {
    ctx.fillStyle = "#a0a0a0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(data);
    ctx.lineWidth = 2;
    let x = 0;
    for (let d of data) {
      const y = canvas.height - (d / 128) * canvas.height / 4;
      const c = Math.floor((x*255)/canvas.width);
      ctx.fillStyle = `rgb(${c},0,${255-x})`;
      ctx.fillRect(x++, y, 2, canvas.height - y)
    }

    analyser.getByteTimeDomainData(data);
    ctx.lineWidth = 5;
    ctx.beginPath();
    x = 0;
    for (let d of data) {
      const y = canvas.height - (d / 128) * canvas.height / 2;
      x ? ctx.lineTo(x++, y) : ctx.moveTo(x++, y);
    }
    ctx.stroke();
  }, 1000 * canvas.width / audioCtx.sampleRate);

  const cleanup = () => {
    audioCtx.close();
    clearInterval(interval);
    ctx.fillStyle = "#a0a0a0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const [track] = stream.getAudioTracks();
  track.addEventListener("ended", cleanup, {once: true});
  track.stop_ = track.stop;
  track.stop = () => track.stop_(cleanup());
  return stream;
};
