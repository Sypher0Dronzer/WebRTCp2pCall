import React, { useEffect, useRef } from "react";

// get a random number between 0-360 
const RANDOM_NUMBER= Math.random() * 350

class Microphone {
  constructor(stream, fftSize) {
    this.initialized = false;
    this.init(stream, fftSize);
  }

  async init(externalStream, fftSize) {
    try {
      const stream =
        externalStream ||
        (await navigator.mediaDevices.getUserMedia({ audio: true }));

      this.audioContext = new AudioContext();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = fftSize;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.microphone.connect(this.analyser);
      this.initialized = true;
    } catch (err) {
      console.error("Microphone init failed:", err);
    }
  }

  getSamples() {
    // this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.dataArray);
    return [...this.dataArray].map((e) => e / 128 - 1);
  }

  getVolume() {
    this.analyser.getByteTimeDomainData(this.dataArray);
    const normalizedSamples = [...this.dataArray].map((e) => e / 128 - 1);
    let sum = 0;
    for (let i = 0; i < normalizedSamples.length; i++) {
      sum += normalizedSamples[i] * normalizedSamples[i];
    }
    return Math.sqrt(sum / normalizedSamples.length);
  }
}

const getPixelRatio = (context) => {
  var backingStore =
    context.backingStorePixelRatio ||
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio ||
    1;

  return (window.devicePixelRatio || 1) / backingStore;
};

const CanvasTest = ({ externalStream }) => {
  const canvasRef = useRef(null);
  const micRef = useRef(null);
  const barsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let ratio = getPixelRatio(ctx);
    let width = getComputedStyle(canvas).getPropertyValue("width").slice(0, -2);
    let height = getComputedStyle(canvas)
      .getPropertyValue("height")
      .slice(0, -2);

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;

    class Bar {
      constructor(x, y, width, height, color, index) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.index = index;
      }
      update(micInput) {
        let sound = micInput * 700;

        if (Math.abs(this.height) > sound) {
          this.height -= this.height * 0.03;
        } else this.height = sound;
      }
      draw1(context, volume) {
        // context.fillStyle = this.color;
        // context.fillRect(this.x, this.y, this.width, this.height);

        context.strokeStyle = this.color;
        context.save();
        context.translate(0, 0);
        context.rotate(this.index * 0.03);
        context.scale(1 + volume * 0.2, 1 + volume * 0.2);
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.y, this.height);
        // context.bezierCurveTo(
        //   100,
        //   100,
        //   this.height,
        //   this.height,
        //   this.x,
        //   this.y * 2
        // );
        context.stroke();
        context.rotate(this.index * 0.02);
        //context.stroke Rect(this.y +this.index 1.5, this.height, this. height/2, this.height);
        context.beginPath();
        context.arc(
          this.x + this.index * 2.5,
          this.y,
          this.height * 0.5,
          0,
          Math.PI * 2
        );
        context.stroke();
        context.restore();
      }
      draw2(ctx, i, dataArray, bufferLength) {
        this.height = dataArray[i] * 0.7;
        ctx.save();
        this.x = Math.sin((i * Math.PI) / 180) + 55;
        this.y = Math.cos((i * Math.PI) / 180) + 55;
        ctx.translate(canvas.width / 2 , canvas.height / 2);
        ctx.rotate(i + (Math.PI * 2) / bufferLength);
        const hue = (i * 1.2 + RANDOM_NUMBER) % 360;
        ctx.fillStyle = "hsl(" + hue + ",100%, 50%)";
        ctx.strokeStyle = "hsl(" + hue + ",100%, 50%)";

        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(0,0,0,1)";

        ctx.globalCompositeOperation = "source-over";

        // line
       ctx.lineWidth = this.height /7 >25 ?25 : this.height /7;;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y - this.height);
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.closePath();

        // circle
        ctx.beginPath();
        ctx.arc(0, this.y + this.height, this.height / 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "hsl(1, 100%, " + i / 3 + "%)";
        ctx.stroke();

        ctx.restore();
        this.x += barWidth;
      }
    }
    const fftSize = 512;
    micRef.current = new Microphone(externalStream, fftSize);
    const barWidth = canvas.width / (fftSize / 2);

    for (let i = 0; i < fftSize / 2; i++) {
      const color = `hsl(${i * 2},100%,50%)`;
      barsRef.current.push(new Bar(0, i * 1.5, 5, 50, color, i));
    }
    // let angle = 0;
    const animate = () => {
      if (micRef.current && micRef.current.initialized) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      micRef.current.getSamples();
        // const volume = micRef.current.getVolume();
        // angle -= 0.0001 + volume * 0.05;

        // ctx.save();
        // ctx.translate(canvas.width / 2, canvas.height / 2);
        // ctx.rotate(angle);

        barsRef.current.forEach((bar, i) => {
          // bar.update(samples[i]);
          // bar.draw1(ctx, volume);

          // const barWidth = 15;
          // let barHeight;
        bar.draw2(ctx, i, micRef.current.dataArray, fftSize / 2);
          // bar.draw2(ctx, fftSize / 2, barWidth, barHeight);
        });
        ctx.restore();
      }
      requestAnimationFrame(animate);
    };

    animate();
  }, [externalStream]);

  return (
    // <div className="w-full h-full   overflow-hidden">
      <canvas className="w-full h-full bg-red" ref={canvasRef} />
    // </div>
  );
};

export default CanvasTest;
