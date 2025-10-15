  let descrambling = true;

  onmessage = async ({data: {readable, writable, role, descramble}}) => {
    if (readable) {
      const transform = (role == "send")? transform1 : transform2;
      await readable.pipeThrough(new TransformStream({transform})).pipeTo(writable);
    } else if (descramble !== undefined){
      descrambling = descramble;
    }
  };

  function transform1(chunk, controller) {
    const bytes = new Uint8Array(chunk.data);
    const offset = 4; /* leave the first 4 bytes alone in VP8 */
    for (let i = offset; i < bytes.length; i++) {
      bytes[i] = ~bytes[i]; /* XOR the rest */
    }
    controller.enqueue(chunk);
  }

  function transform2(chunk, controller) {
    const bytes = new Uint8Array(chunk.data);
    const offset = 4; /* leave the first 4 bytes alone in VP8 */
    for (let i = offset; i < bytes.length; i++) {
      bytes[i] = ~bytes[i]; /* XOR the rest */
    }
    if (!descrambling) {
      for (let i = offset+10; i < offset+12; i++) {
        bytes[i] = ~bytes[i]; /* reverse a few XOR for spectacle */
      }
    }
    controller.enqueue(chunk);
  }
