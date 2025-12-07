import React, { useRef, useEffect, useState } from 'react';
import { Position, NPC, Fighter } from '../types';
import { MessageCircle, Swords } from 'lucide-react';

interface GardenSceneProps {
  player: Fighter;
  npcs: NPC[];
  playerPosition: Position;
  onMove: (pos: Position) => void;
  onInteract: (npc: NPC) => void;
}

// A 3D volumetric representation of an emoji using layered text-shadows/layers
const Vegetable3D = ({ emoji, isPlayer = false, size = 60 }: { emoji: string, isPlayer?: boolean, size?: number }) => {
  // Create layers to simulate thickness
  const layers = 6;
  
  return (
    <div 
      className="relative pointer-events-none" 
      style={{ 
        width: size, 
        height: size, 
        transformStyle: 'preserve-3d' 
      }}
    >
      {Array.from({ length: layers }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center justify-center select-none"
          style={{
            transform: `translateZ(${-i * 2}px)`,
            zIndex: layers - i,
            opacity: 1,
            filter: i === 0 ? 'none' : `brightness(${1 - i * 0.1}) grayscale(${i * 0.1})`, // Darker and greyer towards back
            textShadow: '0 0 2px rgba(0,0,0,0.2)' // Smooth edges
          }}
        >
          <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{emoji}</span>
        </div>
      ))}
      
      {/* Selection Ring for Player */}
      {isPlayer && (
        <div 
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-full h-full rounded-full border-4 border-white/60 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            style={{ 
                transform: 'rotateX(90deg) scale(1.2)',
                width: size,
                height: size
            }}
        />
      )}
    </div>
  );
};

export const GardenScene: React.FC<GardenSceneProps> = ({ player, npcs, playerPosition, onMove, onInteract }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleGroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!groundRef.current) return;
    
    // Get click coordinates relative to the ground element
    // This works even with CSS 3D transforms
    const rect = groundRef.current.getBoundingClientRect();
    
    // We can't rely solely on clientX/Y mapped to rect because of the 3D rotation perspective distortion
    // However, e.nativeEvent.offsetX/Y gives the offset within the target node (the ground)
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // Boundary checks (assuming ground is 2000x2000)
    const clampedX = Math.max(50, Math.min(1950, x));
    const clampedY = Math.max(50, Math.min(1950, y));

    onMove({ x: clampedX, y: clampedY });
  };

  // Camera Logic: Keep player in center
  // We translate the world so the player is at the center of the viewport
  const cameraX = -playerPosition.x + (viewportSize.width / 2);
  const cameraY = -playerPosition.y + (viewportSize.height / 2);

  // 3D settings
  const TILT_ANGLE = 60; // degrees

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ 
        perspective: '1000px',
        // Realistic Sky Gradient: Deep blue top -> Hazy horizon -> Greenish blend
        background: 'linear-gradient(to bottom, #4CA1AF 0%, #C4E0E5 60%, #96c93d 100%)' 
      }}
    >
      {/* 3D World Container */}
      <div 
        className="absolute w-full h-full transition-transform duration-500 ease-out will-change-transform"
        style={{
          transformStyle: 'preserve-3d',
          // Order: Rotate camera angle, then move world to center player
          transform: `rotateX(${TILT_ANGLE}deg) translate3d(${cameraX}px, ${cameraY}px, 0px)`
        }}
      >
        {/* Ground Plane with Realistic Texture */}
        <div 
          ref={groundRef}
          className="absolute origin-top-left cursor-pointer shadow-2xl"
          style={{
            width: '2000px',
            height: '2000px',
            // High quality seamless grass texture
            backgroundImage: `
                linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.3)),
                url('https://images.unsplash.com/photo-1558905540-212901993a1d?q=80&w=500&auto=format&fit=crop')
            `,
            backgroundSize: '400px 400px', // Tile size
            backgroundRepeat: 'repeat',
            transform: 'translateZ(-1px)', 
            boxShadow: 'inset 0 0 500px rgba(0,0,0,0.5)', // Atmospheric darkening at edges
            imageRendering: 'auto'
          }}
          onClick={handleGroundClick}
        >
             {/* Decorative Elements on Ground - enhanced blending */}
             <div className="absolute top-[200px] left-[200px] text-6xl opacity-80 select-none pointer-events-none transform -rotate-45 drop-shadow-lg grayscale-[30%]">🌿</div>
             <div className="absolute top-[250px] left-[220px] text-4xl opacity-70 select-none pointer-events-none transform rotate-12 drop-shadow-md">🌱</div>
             
             <div className="absolute top-[800px] left-[600px] text-6xl opacity-90 select-none pointer-events-none transform rotate-12 drop-shadow-xl grayscale-[20%]">🪨</div>
             <div className="absolute top-[820px] left-[650px] text-3xl opacity-80 select-none pointer-events-none transform -rotate-12">🍄</div>
             
             <div className="absolute top-[1500px] left-[1200px] text-6xl opacity-80 select-none pointer-events-none transform rotate-90 drop-shadow-lg">🌻</div>
             <div className="absolute top-[1550px] left-[1250px] text-5xl opacity-80 select-none pointer-events-none transform rotate-45">🌾</div>

             <div className="absolute top-[400px] right-[400px] text-6xl opacity-60 select-none pointer-events-none drop-shadow-md">💧</div>
             
             <div className="absolute bottom-[200px] right-[800px] text-8xl opacity-90 select-none pointer-events-none drop-shadow-2xl grayscale-[40%]">🪵</div>
             <div className="absolute bottom-[250px] right-[750px] text-4xl opacity-70 select-none pointer-events-none transform rotate-45">🍃</div>
             
             {/* Random grass tufts for density */}
             <div className="absolute top-[1200px] left-[300px] text-4xl opacity-50 select-none pointer-events-none grayscale-[20%]">🌿</div>
             <div className="absolute top-[600px] left-[1600px] text-4xl opacity-50 select-none pointer-events-none grayscale-[20%]">🌿</div>
             <div className="absolute top-[1800px] left-[900px] text-4xl opacity-50 select-none pointer-events-none grayscale-[20%]">🌿</div>
             <div className="absolute top-[100px] left-[1500px] text-5xl opacity-40 select-none pointer-events-none grayscale-[20%]">☘️</div>
        </div>

        {/* NPCs */}
        {npcs.map((npc) => (
          <div
            key={npc.id}
            className="absolute flex flex-col items-center justify-end transition-all duration-300 transform"
            style={{ 
              left: npc.position.x, 
              top: npc.position.y,
              transformStyle: 'preserve-3d',
              transform: `translate3d(-50%, -100%, 10px) rotateX(-${TILT_ANGLE}deg)`, // Stand up facing camera
              zIndex: Math.floor(npc.position.y)
            }}
            onClick={(e) => {
              e.stopPropagation();
              onInteract(npc);
            }}
          >
             {/* Interaction Indicator */}
             <div className="absolute -top-12 animate-bounce transition-transform duration-300 hover:scale-125 cursor-pointer" style={{ transform: 'translateZ(20px)' }}>
                <div className={`p-2 rounded-full shadow-lg border-2 border-white ${npc.isAggressive ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {npc.isAggressive ? <Swords size={20} className="text-white"/> : <MessageCircle size={20} className="text-white"/>}
                </div>
            </div>

            {/* 3D Character */}
            <Vegetable3D emoji={npc.emoji} size={70} />

            {/* Nameplate */}
            <div 
                className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full mt-2 backdrop-blur-md border border-white/20 whitespace-nowrap shadow-md"
                style={{ transform: 'translateZ(5px)' }}
            >
              {npc.name}
            </div>

            {/* Realistic Shadow */}
            <div 
                className="absolute top-full w-16 h-8 bg-black/40 rounded-[50%] blur-sm pointer-events-none"
                style={{ transform: `rotateX(${TILT_ANGLE}deg) translateY(-60%) translateZ(-10px)` }}
            ></div>
          </div>
        ))}

        {/* Player */}
        <div
          className="absolute flex flex-col items-center justify-end transition-all duration-500 ease-out pointer-events-none"
          style={{ 
            left: playerPosition.x, 
            top: playerPosition.y,
            transformStyle: 'preserve-3d',
            transform: `translate3d(-50%, -100%, 10px) rotateX(-${TILT_ANGLE}deg)`,
            zIndex: Math.floor(playerPosition.y) + 10
          }}
        >
          {/* Player Name */}
          <div className="absolute -top-8 text-green-900 font-bold text-xs bg-white/90 px-3 py-1 rounded-full shadow-lg border border-green-200">
             {player.name}
          </div>

          <Vegetable3D emoji={player.emoji} isPlayer={true} size={80} />

           {/* Realistic Shadow */}
           <div 
                className="absolute top-full w-20 h-10 bg-black/50 rounded-[50%] blur-md"
                style={{ transform: `rotateX(${TILT_ANGLE}deg) translateY(-60%) translateZ(-10px)` }}
            ></div>
        </div>

      </div>
      
      {/* HUD Overlay */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none z-50">
        <div className="inline-block bg-black/60 text-white px-6 py-3 rounded-full text-sm font-bold backdrop-blur-md shadow-lg border border-white/10">
          <span className="mr-2">🌱</span> 3D 菜园模式：拖动探索，点击移动
        </div>
      </div>
      
      {/* Atmospheric Fog / Sky overlay */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-10 mix-blend-overlay"></div>
    </div>
  );
};