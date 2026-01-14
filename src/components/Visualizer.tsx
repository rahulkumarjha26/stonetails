import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  active: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;

    const render = () => {
      // Resize
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.4;
      
      // Calculate expansion based on volume (0-255 approx)
      // Smooth the volume slightly for visual appeal would be ideal, but direct mapping is responsive
      const expansion = active ? (volume / 255) * 50 : 5; 
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw "Stoic Orb" - Inner Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + expansion * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917'; // stone-900
      ctx.fill();
      ctx.strokeStyle = '#d4af37'; // gold
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Halo / Rings
      if (active) {
        rotation += 0.005 + (volume / 5000); 
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        
        // Ring 1
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadius + expansion + 20, baseRadius + expansion, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Ring 2 (Offset)
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadius + expansion + 10, baseRadius + expansion + 30, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.stroke();
        
        ctx.restore();
        
        // Particles
        if (volume > 10) {
             const particleCount = Math.floor(volume / 10);
             for(let i=0; i<particleCount; i++) {
                 const angle = Math.random() * Math.PI * 2;
                 const dist = baseRadius + expansion + 20 + Math.random() * 20;
                 const x = centerX + Math.cos(angle) * dist;
                 const y = centerY + Math.sin(angle) * dist;
                 
                 ctx.beginPath();
                 ctx.arc(x, y, 1, 0, Math.PI * 2);
                 ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
                 ctx.fill();
             }
        }
      } else {
        // Idle state - gentle pulse
        const pulse = Math.sin(Date.now() / 1000) * 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [volume, active]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default Visualizer;
