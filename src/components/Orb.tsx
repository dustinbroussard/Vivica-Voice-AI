import { useEffect, useRef } from 'react';
import { AssistantState } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return { r: 0, g: 255, b: 136 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function rgbaStr({ r, g, b }: { r: number, g: number, b: number }, a: number) {
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lerpColor(color1: string, color2: string, factor: number) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function Orb({ state }: { state: AssistantState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let volume = 0;
    let targetVolume = 0;
    let currentMoodColor = '#00FF88'; // listening
    let targetMoodColor = '#00FF88';
    let pulseOffset = 0;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawOrb = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const isListening = stateRef.current === 'listening';
      const isProcessing = stateRef.current === 'processing';
      const isSpeaking = stateRef.current === 'speaking';
      const isError = stateRef.current === 'error';
      const isIdle = stateRef.current === 'idle';

      // Update target color and volume
      if (isListening) {
        targetMoodColor = '#00FF88';
        targetVolume = 0.2 + Math.random() * 0.3;
      } else if (isProcessing) {
        targetMoodColor = '#FFD700';
        targetVolume = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
      } else if (isSpeaking) {
        targetMoodColor = '#FF6B6B';
        targetVolume = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
      } else if (isError) {
        targetMoodColor = '#FF4444';
        targetVolume = 0;
      } else {
        targetMoodColor = '#444466';
        targetVolume = 0;
      }

      volume += (targetVolume - volume) * 0.15;
      if (currentMoodColor !== targetMoodColor) {
        currentMoodColor = lerpColor(currentMoodColor, targetMoodColor, 0.05);
      }
      
      pulseOffset += isProcessing ? 0.2 : 0.05;

      const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.15;
      const volumeRadius = volume * (baseRadius * 2);
      const pulseRadius = Math.sin(pulseOffset) * (baseRadius * 0.2);
      const radius = Math.max(10, baseRadius + volumeRadius + pulseRadius);

      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;

      const rgb = hexToRgb(currentMoodColor);
      
      // Update background gradient slightly based on mood
      document.body.style.background = `radial-gradient(circle, ${rgbaStr(rgb, 0.13)} 0%, black 80%)`;

      // Outer glow
      const outerGlow = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 3);
      outerGlow.addColorStop(0, rgbaStr(rgb, 0.25));
      outerGlow.addColorStop(0.5, rgbaStr(rgb, 0.125));
      outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.beginPath();
      ctx.fillStyle = outerGlow;
      ctx.arc(x, y, Math.max(0, radius * 3), 0, Math.PI * 2);
      ctx.fill();

      // Main orb
      const gradient = ctx.createRadialGradient(x, y, 10, x, y, radius);
      gradient.addColorStop(0, rgbaStr(rgb, 0.8));
      gradient.addColorStop(0.4, rgbaStr(rgb, 0.53));
      gradient.addColorStop(0.8, rgbaStr(rgb, 0.27));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
      ctx.fill();

      // Inner core
      const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.3);
      coreGradient.addColorStop(0, '#FFFFFF');
      coreGradient.addColorStop(1, rgbaStr(rgb, 0.53));
      
      ctx.beginPath();
      ctx.fillStyle = coreGradient;
      ctx.arc(x, y, Math.max(0, radius * 0.3), 0, Math.PI * 2);
      ctx.fill();

      // Particles
      if (volume > 0.1 || isProcessing) {
        for (let i = 0; i < (isProcessing ? 5 : 2); i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = radius * (0.5 + Math.random() * 0.5);
          const px = x + Math.cos(angle) * distance;
          const py = y + Math.sin(angle) * distance;
          particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1.0,
            size: Math.random() * 3 + 1
          });
        }
      }

      particles = particles.filter(p => p.life > 0);
      if (particles.length > 800) particles.length = 800; // Limit particles

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.01;
        p.vx *= 0.99;
        p.vy *= 0.99;

        const alpha = Math.max(0, p.life);
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = currentMoodColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0, p.size * alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    const animate = () => {
      drawOrb();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 touch-none pointer-events-none"
    />
  );
}
