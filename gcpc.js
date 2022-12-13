import {SrsRtcPlayerAsync} from "./gcpc2.js";

const video = document.querySelector("video");
const player = SrsRtcPlayerAsync();
player.play();
video.srcObject = player.stream;
