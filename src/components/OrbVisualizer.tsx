import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface OrbVisualizerProps {
    volume: number;
    active: boolean;
}

const OrbVisualizer: React.FC<OrbVisualizerProps> = ({ volume, active }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const orbRef = useRef<THREE.Mesh | null>(null);
    const glowRef = useRef<THREE.Mesh | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const frameIdRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // CLEANUP: Remove any existing canvas to prevent double-rendering
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 7;
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Resize handler
        const updateSize = () => {
            if (!containerRef.current) return;
            const size = Math.min(containerRef.current.clientWidth, containerRef.current.clientHeight);
            renderer.setSize(size, size);
            camera.aspect = 1;
            camera.updateProjectionMatrix();
        };
        updateSize();
        window.addEventListener('resize', updateSize);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0xb084cc, 3, 10);
        pointLight1.position.set(2, 2, 4);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xd4af37, 2, 10);
        pointLight2.position.set(-2, -2, 4);
        scene.add(pointLight2);

        // Orb Material - Enhanced Fluid Shader
        const orbMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uVolume: { value: 0 },
                uActive: { value: 0 },
                uColorCore: { value: new THREE.Color(0xe0c3fc) },
                uColorGlow: { value: new THREE.Color(0xb084cc) },
                uColorGold: { value: new THREE.Color(0xd4af37) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uVolume;
                uniform float uActive;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vDisplacement;
                
                // Simplex noise function
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                
                float snoise(vec3 v) {
                    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                    vec3 i  = floor(v + dot(v, C.yyy));
                    vec3 x0 = v - i + dot(i, C.xxx);
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min(g.xyz, l.zxy);
                    vec3 i2 = max(g.xyz, l.zxy);
                    vec3 x1 = x0 - i1 + C.xxx;
                    vec3 x2 = x0 - i2 + C.yyy;
                    vec3 x3 = x0 - D.yyy;
                    i = mod289(i);
                    vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                    float n_ = 0.142857142857;
                    vec3 ns = n_ * D.wyz - D.xzx;
                    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_);
                    vec4 x = x_ *ns.x + ns.yyyy;
                    vec4 y = y_ *ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    vec4 b0 = vec4(x.xy, y.xy);
                    vec4 b1 = vec4(x.zw, y.zw);
                    vec4 s0 = floor(b0)*2.0 + 1.0;
                    vec4 s1 = floor(b1)*2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                    vec3 p0 = vec3(a0.xy, h.x);
                    vec3 p1 = vec3(a0.zw, h.y);
                    vec3 p2 = vec3(a1.xy, h.z);
                    vec3 p3 = vec3(a1.zw, h.w);
                    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                    p0 *= norm.x;
                    p1 *= norm.y;
                    p2 *= norm.z;
                    p3 *= norm.w;
                    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                }
                
                void main() {
                    vNormal = normal;
                    vPosition = position;
                    
                    // Smoother, more liquid-like movement
                    float time = uTime * 0.8;
                    float baseDisp = 0.1 + uActive * 0.15;
                    float volumeDisp = uVolume * 0.008; // Increased sensitivity
                    
                    float noise1 = snoise(position * 1.5 + vec3(time * 0.5, time * 0.3, 0.0));
                    float noise2 = snoise(position * 3.0 - vec3(0.0, time * 0.8, time * 0.2));
                    
                    // Combine noise for fluid effect
                    float displacement = (noise1 + noise2 * 0.5) * (baseDisp + volumeDisp);
                    vDisplacement = displacement;
                    
                    vec3 newPosition = position + normal * displacement;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uVolume;
                uniform float uActive;
                uniform vec3 uColorCore;
                uniform vec3 uColorGlow;
                uniform vec3 uColorGold;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vDisplacement;
                
                void main() {
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);
                    
                    // Dynamic pulsing
                    float pulse = sin(uTime * 1.5) * 0.5 + 0.5;
                    float volumePulse = uVolume * 0.01;
                    
                    // Color mixing
                    vec3 baseColor = mix(uColorGlow, uColorCore, fresnel * 0.8);
                    
                    // Gold highlights on peaks
                    float highlight = smoothstep(0.1, 0.3, vDisplacement);
                    vec3 goldAccent = uColorGold * highlight * (0.5 + uActive * 0.5);
                    
                    vec3 finalColor = baseColor + goldAccent;
                    
                    // Add inner glow
                    finalColor += uColorCore * fresnel * (0.2 + volumePulse);
                    
                    // Opacity handling
                    float alpha = 0.85 + fresnel * 0.15;
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.FrontSide
        });

        // Main Orb
        const orbGeometry = new THREE.IcosahedronGeometry(1.2, 128); // Higher detail
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        scene.add(orb);
        orbRef.current = orb;

        // Outer Glow (Halo)
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uActive: { value: 0 },
                uColor: { value: new THREE.Color(0xb084cc) }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uActive;
                uniform vec3 uColor;
                varying vec3 vNormal;
                
                void main() {
                    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
                    float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
                    vec3 glow = uColor * intensity * pulse * (0.5 + uActive * 0.5);
                    gl_FragColor = vec4(glow, intensity);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 64), glowMaterial);
        scene.add(glow);
        glowRef.current = glow;

        // Particles
        const particleCount = 150;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const randoms = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2.0 + Math.random() * 1.5;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            randoms[i] = Math.random();
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0xd4af37) }
            },
            vertexShader: `
                uniform float uTime;
                attribute float aRandom;
                varying float vAlpha;
                
                void main() {
                    vec3 pos = position;
                    // Orbit animation
                    float angle = uTime * (0.1 + aRandom * 0.1);
                    float x = pos.x * cos(angle) - pos.z * sin(angle);
                    float z = pos.x * sin(angle) + pos.z * cos(angle);
                    pos.x = x;
                    pos.z = z;
                    
                    // Vertical float
                    pos.y += sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = (4.0 * aRandom + 2.0) * (10.0 / -mvPosition.z);
                    
                    vAlpha = 0.5 + 0.5 * sin(uTime * 3.0 + aRandom * 10.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                varying float vAlpha;
                
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    float glow = 1.0 - (r * 2.0);
                    glow = pow(glow, 1.5);
                    gl_FragColor = vec4(uColor, vAlpha * glow);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        particlesRef.current = particles;

        // Animation Loop
        const clock = new THREE.Clock();
        const animate = () => {
            const time = clock.getElapsedTime();

            if (orbRef.current) {
                const mat = orbRef.current.material as THREE.ShaderMaterial;
                mat.uniforms.uTime.value = time;
                // Gentle rotation
                orbRef.current.rotation.y = time * 0.05;
            }

            if (glowRef.current) {
                const mat = glowRef.current.material as THREE.ShaderMaterial;
                mat.uniforms.uTime.value = time;
                glowRef.current.rotation.y = -time * 0.05;
            }

            if (particlesRef.current) {
                const mat = particlesRef.current.material as THREE.ShaderMaterial;
                mat.uniforms.uTime.value = time;
            }

            renderer.render(scene, camera);
            frameIdRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', updateSize);
            cancelAnimationFrame(frameIdRef.current);
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            orbGeometry.dispose();
            orbMaterial.dispose();
            glowMaterial.dispose();
            particleMaterial.dispose();
        };
    }, []);

    // Update uniforms based on props
    useEffect(() => {
        if (orbRef.current) {
            const mat = orbRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uVolume.value = volume;
            mat.uniforms.uActive.value = active ? 1 : 0;
        }
        if (glowRef.current) {
            const mat = glowRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uActive.value = active ? 1 : 0;
        }
        if (particlesRef.current) {
            (particlesRef.current.material as THREE.PointsMaterial).opacity = active ? 0.8 : 0.3;
        }
    }, [volume, active]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        />
    );
};

export default OrbVisualizer;
