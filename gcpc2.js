const console = {log: msg => div.innerHTML += `${msg}<br>`};
const wait = ms => new Promise(r => setTimeout(r, ms));

function SrsRtcPlayerAsync() {
  const self = {};
  self.play = async () => {
    self.pc.addTransceiver("audio", { direction: "recvonly" });
    self.pc.addTransceiver("video", { direction: "recvonly" });
    await self.pc.setLocalDescription();
    const gathered = wait(1000);
    const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
    await gathered;
    const pc2 = new RTCPeerConnection();
    window.pc2 = pc2;
    for (const track of stream.getTracks()) {
//      track.enabled = false;
      pc2.addTrack(track, stream);
    }
    await pc2.setRemoteDescription(self.pc.localDescription);
    await pc2.setLocalDescription();
    await wait(1000);
    await self.pc.setRemoteDescription(pc2.localDescription);
  };
  self.ontrack = function(event) {
    self.stream.addTrack(event.track);
  };

  self.pc = new RTCPeerConnection();
  self.stream = new MediaStream();
  self.pc.ontrack = function(event) {
    if (self.ontrack) {
      self.ontrack(event);
    }
  };
  return self;
}

export {SrsRtcPlayerAsync};

