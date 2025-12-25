'use client';

import React, { useEffect, useRef } from 'react';

const StarkLogo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: 0, y: 0, radius: 120 };

    // 获取当前是否为深色模式
    const getIsDark = () => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches || 
             document.documentElement.classList.contains('dark');
    };

    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      density: number;

      constructor(x: number, y: number) {
        this.x = Math.random() * 800; // 从随机位置出现
        this.y = Math.random() * 300;
        this.baseX = x;
        this.baseY = y;
        this.size = Math.random() * 1.5 + 1;
        this.density = Math.random() * 30 + 10;
      }

      draw() {
        if (!ctx) return;
        const isDark = getIsDark();
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          const directionX = forceDirectionX * force * this.density;
          const directionY = forceDirectionY * force * this.density;
          this.x -= directionX;
          this.y -= directionY;
        } else {
          // 缓慢回到原位
          if (this.x !== this.baseX) {
            this.x -= (this.x - this.baseX) / 10;
          }
          if (this.y !== this.baseY) {
            this.y -= (this.y - this.baseY) / 10;
          }
        }
      }
    }

    const init = () => {
      const isDark = getIsDark();
      canvas.width = 800;
      canvas.height = 250;
      
      // 先画出文字用来采样
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white'; // 采样用的临时颜色
      ctx.font = 'bold 120px Inter, system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STARK', canvas.width / 2, canvas.height / 2);

      const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
      particles = [];

      // 采样步长调小一点（2或3），让文字更细腻
      for (let y = 0; y < textCoordinates.height; y += 3) {
        for (let x = 0; x < textCoordinates.width; x += 3) {
          // 如果透明度大于128，就在该点创建粒子
          if (textCoordinates.data[y * 4 * textCoordinates.width + x * 4 + 3] > 128) {
            particles.push(new Particle(x, y));
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw();
        particles[i].update();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    // 稍微延迟初始化，确保布局和字体加载
    const timer = setTimeout(() => {
      init();
      animate();
    }, 100);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', init);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <div className="flex justify-center items-center w-full min-h-[250px] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto cursor-crosshair"
      />
    </div>
  );
};

export default StarkLogo;
