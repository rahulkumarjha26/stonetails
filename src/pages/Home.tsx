import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import { Link } from 'react-router-dom';
import marcusImgUrl from '../assets/marcus.jpeg';
import productDemoUrl from '../assets/product-demo.mp4';

gsap.registerPlugin(ScrollTrigger);

const Home: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loaderProgress, setLoaderProgress] = useState(0);
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        // === CONFIG ===
        const config = {
            colors: {
                bg: 0x050505,
                stoneBase: 0x4a4e52,
                stoneDark: 0x2b2e31,
                ambient: 0x202225,
                spotWarm: 0xfff0dd,
                rimCool: 0x5a6e8c,
                magicCore: 0xe0c3fc,
                magicGlow: 0x9d4edd
            }
        };

        const state = {
            mouse: { x: 0, y: 0 },
            targetMouse: { x: 0, y: 0 },
            cuboidIntegrity: 1,
            artifactReveal: 0,
            nfcConnection: 0,
            screenBrightness: 0,
            time: 0
        };

        // === SCROLL ===
        const lenis = new Lenis({ duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
        function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);

        // === THREE.JS ===
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(config.colors.bg);
        scene.fog = new THREE.FogExp2(config.colors.bg, 0.05);

        const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 10);

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);

        setLoaderProgress(20);

        // === LIGHTS ===
        scene.add(new THREE.AmbientLight(config.colors.ambient, 0.6));

        const keyLight = new THREE.SpotLight(config.colors.spotWarm, 1.2);
        keyLight.position.set(5, 5, 8);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const rimLight = new THREE.PointLight(config.colors.rimCool, 0.8);
        rimLight.position.set(-5, 2, -5);
        scene.add(rimLight);

        const cuboidGlow = new THREE.PointLight(0xd4c5a3, 0, 4);
        cuboidGlow.position.set(0, 0, 3);
        scene.add(cuboidGlow);

        const nfcLight = new THREE.PointLight(config.colors.magicGlow, 0, 8);
        scene.add(nfcLight);

        // === MATERIALS ===
        const stoneMat = new THREE.MeshStandardMaterial({
            color: config.colors.stoneBase,
            roughness: 0.85,
            metalness: 0.08,
            flatShading: false
        });

        // Create chamfered box geometry for premium look
        function createChamferedBox(w: number, h: number, d: number, bevel = 0.015) {
            const shape = new THREE.Shape();
            const hw = w / 2 - bevel;
            const hh = h / 2 - bevel;
            shape.moveTo(-hw, -h / 2);
            shape.lineTo(hw, -h / 2);
            shape.lineTo(w / 2, -hh);
            shape.lineTo(w / 2, hh);
            shape.lineTo(hw, h / 2);
            shape.lineTo(-hw, h / 2);
            shape.lineTo(-w / 2, hh);
            shape.lineTo(-w / 2, -hh);
            shape.closePath();
            const settings = { steps: 1, depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 };
            const geo = new THREE.ExtrudeGeometry(shape, settings);
            geo.translate(0, 0, -d / 2);
            geo.computeVertexNormals();
            return geo;
        }

        const pewterMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.4, metalness: 0.9 });
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });

        // === OBJECTS ===
        const mainGroup = new THREE.Group();
        scene.add(mainGroup);

        // 1. CUBOID (THE STONE) - Premium Fragments
        const cuboidGroup = new THREE.Group();
        mainGroup.add(cuboidGroup);
        const fragments: THREE.Mesh[] = [];

        // Dust particle system
        const dustCount = 200;
        const dustGeo = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustVelocities: THREE.Vector3[] = [];
        const dustOpacities = new Float32Array(dustCount);
        for (let i = 0; i < dustCount; i++) {
            dustPositions[i * 3] = (Math.random() - 0.5) * 2;
            dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
            dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 1;
            dustVelocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 0.5 + 0.2,
                (Math.random() - 0.5) * 1.5
            ));
            dustOpacities[i] = 0;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0x6a6e72,
            size: 0.025,
            transparent: true,
            opacity: 0,
            blending: THREE.NormalBlending,
            depthWrite: false
        });
        const dustParticles = new THREE.Points(dustGeo, dustMat);
        cuboidGroup.add(dustParticles);

        // Create 5x5x4 grid of premium stone fragments
        const cSize = { x: 2.2, y: 1.6, z: 1.2 };
        const gridX = 5, gridY = 5, gridZ = 4;
        const fragW = cSize.x / gridX, fragH = cSize.y / gridY, fragD = cSize.z / gridZ;

        for (let x = 0; x < gridX; x++) {
            for (let y = 0; y < gridY; y++) {
                for (let z = 0; z < gridZ; z++) {
                    const localMat = stoneMat.clone();
                    const hueShift = (Math.random() - 0.5) * 0.02;
                    const satShift = (Math.random() - 0.5) * 0.05;
                    const lightShift = (Math.random() - 0.5) * 0.15;
                    localMat.color.offsetHSL(hueShift, satShift, lightShift);
                    localMat.roughness = 0.75 + Math.random() * 0.2;
                    localMat.metalness = 0.05 + Math.random() * 0.1;

                    const sizeVar = 0.7 + Math.random() * 0.3;
                    const geo = createChamferedBox(fragW * sizeVar, fragH * sizeVar, fragD * sizeVar, 0.012);
                    const mesh = new THREE.Mesh(geo, localMat);

                    const jx = (x - (gridX - 1) / 2) * fragW;
                    const jy = (y - (gridY - 1) / 2) * fragH;
                    const jz = (z - (gridZ - 1) / 2) * fragD;
                    mesh.position.set(jx, jy, jz);
                    mesh.rotation.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    const distFromCenter = Math.sqrt(jx * jx + jy * jy + jz * jz);
                    const explosionDir = new THREE.Vector3(jx, jy, jz).normalize();
                    explosionDir.y += 0.3 + Math.random() * 0.4;
                    explosionDir.x += (Math.random() - 0.5) * 0.6;
                    explosionDir.z += (Math.random() - 0.5) * 0.8;
                    explosionDir.normalize();

                    mesh.userData = {
                        pos: mesh.position.clone(),
                        initialRot: mesh.rotation.clone(),
                        dir: explosionDir,
                        speed: 0.6 + distFromCenter * 0.4 + Math.random() * 0.4,
                        delay: distFromCenter * 0.12 + Math.random() * 0.15,
                        tumbleX: (Math.random() - 0.5) * 8,
                        tumbleY: (Math.random() - 0.5) * 8,
                        tumbleZ: (Math.random() - 0.5) * 6,
                        gravity: 0.3 + Math.random() * 0.2
                    };
                    cuboidGroup.add(mesh);
                    fragments.push(mesh);
                }
            }
        }
        setLoaderProgress(50);

        // 2. ARTIFACT
        const artifactGroup = new THREE.Group();
        mainGroup.add(artifactGroup);
        artifactGroup.visible = false;

        const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.08, 128, 16), pewterMat);
        artifactGroup.add(knot);

        const chainGroup = new THREE.Group();
        artifactGroup.add(chainGroup);
        for (let i = 0; i < 25; i++) {
            const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), chainMat);
            link.position.y = 0.6 + (i * 0.1);
            link.rotation.y = (i % 2) * (Math.PI / 2);
            chainGroup.add(link);
        }

        const orbMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0 },
                uColorCore: { value: new THREE.Color(config.colors.magicCore) },
                uColorHot: { value: new THREE.Color(config.colors.magicGlow) }
            },
            transparent: true,
            vertexShader: `
                varying vec3 vPos; varying float vFresnel; uniform float uTime; uniform float uIntensity;
                void main() {
                    vPos = position;
                    vec3 viewDir = normalize(cameraPosition - (modelMatrix * vec4(position,1.)).xyz);
                    vec3 norm = normalize(normalMatrix * normal);
                    vFresnel = pow(1.0 - abs(dot(viewDir, norm)), 2.0);
                    float disp = sin(position.x*10.+uTime*2.)*0.03 * uIntensity;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal*disp, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vPos; varying float vFresnel; uniform float uTime; uniform float uIntensity; uniform vec3 uColorCore; uniform vec3 uColorHot;
                void main() {
                    float pulse = sin(uTime*3.)*0.5+0.5;
                    vec3 col = mix(uColorHot, uColorCore, pulse*0.5);
                    col += uColorCore * vFresnel * 1.5;
                    gl_FragColor = vec4(col, 0.85*uIntensity);
                }
            `
        });
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 4), orbMat);
        artifactGroup.add(orb);

        // 3. PHONE
        const phoneGroup = new THREE.Group();
        scene.add(phoneGroup);
        phoneGroup.visible = false;

        const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.06), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.8 }));
        phoneGroup.add(phoneBody);

        const screenCanvas = document.createElement('canvas');
        screenCanvas.width = 512; screenCanvas.height = 1024;
        const ctx = screenCanvas.getContext('2d')!;
        const screenTex = new THREE.CanvasTexture(screenCanvas);
        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.3), new THREE.MeshBasicMaterial({ map: screenTex, transparent: true }));
        screenMesh.position.z = 0.035;
        phoneGroup.add(screenMesh);

        const arcCount = 60;
        const arcGeo = new THREE.BufferGeometry();
        const arcPos = new Float32Array(arcCount * 3);
        arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
        const arcParts = new THREE.Points(arcGeo, new THREE.PointsMaterial({ color: config.colors.magicCore, size: 0.04, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
        scene.add(arcParts);

        setLoaderProgress(90);

        // Load Marcus Image
        const marcusImg = new Image();
        marcusImg.src = marcusImgUrl;
        let marcusLoaded = false;
        marcusImg.onload = () => { marcusLoaded = true; };

        // === RENDER HELPERS ===
        function drawScreen(brightness: number, time: number, connected: boolean) {
            ctx.fillStyle = `rgb(${brightness * 10}, ${brightness * 12}, ${brightness * 15})`;
            ctx.fillRect(0, 0, 512, 1024);
            if (brightness < 0.01) { screenTex.needsUpdate = true; return; }

            ctx.globalAlpha = brightness;

            if (marcusLoaded) {
                const imgAspect = marcusImg.width / marcusImg.height;
                const canvasAspect = 512 / 1024;
                let drawW, drawH, drawX, drawY;

                if (imgAspect > canvasAspect) {
                    drawH = 1024;
                    drawW = 1024 * imgAspect;
                    drawX = (512 - drawW) / 2;
                    drawY = 0;
                } else {
                    drawW = 512;
                    drawH = 512 / imgAspect;
                    drawX = 0;
                    drawY = (1024 - drawH) / 2;
                }
                ctx.drawImage(marcusImg, drawX, drawY, drawW, drawH);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(0, 0, 512, 1024);
            } else {
                ctx.fillStyle = '#151515';
                ctx.beginPath(); ctx.ellipse(256, 400, 90, 110, 0, 0, 6.28); ctx.fill();
                ctx.beginPath(); ctx.moveTo(80, 1024); ctx.lineTo(80, 650); ctx.quadraticCurveTo(256, 480, 432, 650); ctx.lineTo(432, 1024); ctx.fill();
            }

            ctx.strokeStyle = '#d4c5a3';
            ctx.lineWidth = 5;
            ctx.beginPath();
            const amp = connected ? 50 + Math.sin(time * 15) * 30 : 5;
            for (let x = 50; x < 462; x += 10) {
                const y = 820 + Math.sin(x * 0.04 + time * 6) * amp * Math.sin((x - 50) / 412 * 3.14);
                if (x == 50) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Voice Button
            const btnY = 925;
            const btnR = 45;
            const pulse = connected ? 1 + Math.sin(time * 5) * 0.08 : 1;

            if (connected) {
                const grad = ctx.createRadialGradient(256, btnY, 0, 256, btnY, btnR * 2.2 * pulse);
                grad.addColorStop(0, 'rgba(176, 132, 204, 0.5)');
                grad.addColorStop(1, 'rgba(176, 132, 204, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(256, btnY, btnR * 2.2 * pulse, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(256, btnY, btnR * pulse, 0, Math.PI * 2);
            ctx.fillStyle = connected ? '#b084cc' : 'rgba(255,255,255,0.08)';
            ctx.fill();
            ctx.strokeStyle = connected ? '#fff' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.save();
            ctx.translate(256, btnY - 2);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(-9, -10);
            ctx.arc(0, -10, 9, Math.PI, 0);
            ctx.lineTo(9, 6);
            ctx.arc(0, 6, 9, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 6, 16, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 22);
            ctx.lineTo(0, 28);
            ctx.stroke();
            ctx.restore();

            ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.fillStyle = '#fff'; ctx.font = '500 38px serif'; ctx.textAlign = 'center'; ctx.fillText('Marcus Aurelius', 256, 150);
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(212, 197, 163, 0.9)'; ctx.font = '600 22px sans-serif';
            // @ts-ignore
            ctx.letterSpacing = '2px';
            if (connected) ctx.fillText('LIVE CONVERSATION', 256, 210);

            ctx.globalAlpha = 1; screenTex.needsUpdate = true;
        }

        function updateFragments(integrity: number) {
            const explosion = 1 - integrity;
            if (explosion > 0.1) {
                dustMat.opacity = Math.min(explosion * 0.8, 0.6);
                const dustPos = dustParticles.geometry.attributes.position.array as Float32Array;
                for (let i = 0; i < dustCount; i++) {
                    const vel = dustVelocities[i];
                    dustPos[i * 3] += vel.x * explosion * 0.05;
                    dustPos[i * 3 + 1] += vel.y * explosion * 0.03;
                    dustPos[i * 3 + 2] += vel.z * explosion * 0.04;
                }
                dustParticles.geometry.attributes.position.needsUpdate = true;
            } else {
                dustMat.opacity = 0;
                const dustPos = dustParticles.geometry.attributes.position.array as Float32Array;
                for (let i = 0; i < dustCount; i++) {
                    dustPos[i * 3] = (Math.random() - 0.5) * 2;
                    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
                    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 1;
                }
                dustParticles.geometry.attributes.position.needsUpdate = true;
            }

            fragments.forEach(f => {
                const expl = Math.max(0, explosion - f.userData.delay);
                if (expl > 0) {
                    const easedExpl = 1 - Math.pow(1 - Math.min(expl * 1.2, 1), 3);
                    const dist = easedExpl * 5 * f.userData.speed;
                    const gravityOffset = easedExpl * easedExpl * f.userData.gravity * 2;
                    const newPos = f.userData.pos.clone().add(f.userData.dir.clone().multiplyScalar(dist));
                    newPos.y -= gravityOffset;
                    f.position.copy(newPos);
                    f.rotation.x = f.userData.initialRot.x + easedExpl * f.userData.tumbleX;
                    f.rotation.y = f.userData.initialRot.y + easedExpl * f.userData.tumbleY;
                    f.rotation.z = f.userData.initialRot.z + easedExpl * f.userData.tumbleZ;
                    const scaleFade = Math.max(0, 1 - easedExpl * 0.9);
                    f.scale.setScalar(scaleFade);
                    if (f.material instanceof THREE.Material) {
                        f.material.transparent = true;
                        f.material.opacity = Math.max(0, 1 - easedExpl * 1.1);
                    }
                    f.visible = easedExpl < 0.95;
                } else {
                    f.position.copy(f.userData.pos);
                    f.rotation.copy(f.userData.initialRot);
                    f.scale.setScalar(1);
                    if (f.material instanceof THREE.Material) {
                        f.material.opacity = 1;
                    }
                    f.visible = true;
                }
            });
        }

        // === GSAP TIMELINE ===
        gsap.to('.loader', { opacity: 0, duration: 1, delay: 0.5, onComplete: () => setShowLoader(false) });
        gsap.to(['.brand', '.edition-tag', '.hero-content'], { opacity: 1, y: 0, duration: 1, delay: 0.8, stagger: 0.1 });
        gsap.to(cuboidGlow, { intensity: 0.8, duration: 2, delay: 1 });

        const tl = gsap.timeline({ scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });

        tl.to(state, { cuboidIntegrity: 0, onUpdate: () => updateFragments(state.cuboidIntegrity) }, 0.05);
        tl.to(cuboidGlow, { intensity: 0 }, 0.12);

        tl.call(() => {
            artifactGroup.visible = true;
            artifactGroup.scale.set(0.1, 0.1, 0.1);
        }, [], 0.08);
        tl.to(artifactGroup.scale, { x: 1, y: 1, z: 1, ease: "power2.out" }, 0.08);
        tl.to(state, { artifactReveal: 1 }, 0.1);
        tl.to(orb.material.uniforms.uIntensity, { value: 1 }, 0.1);

        tl.to(artifactGroup.rotation, { y: 2.5 }, 0.4);
        tl.call(() => { phoneGroup.visible = true; phoneGroup.position.set(0, -6, 2); }, [], 0.4);

        tl.to('#connection-text', { opacity: 0, duration: 0.02 }, 0.55);

        tl.to(camera.position, { z: 6 }, 0.55);
        tl.to(phoneGroup.position, { y: -0.3, z: 3.5, x: 0.1 }, 0.55);
        tl.to(phoneGroup.rotation, { x: -0.1, y: -0.15 }, 0.55);
        tl.to(artifactGroup.position, { x: -0.3, y: 0.1, z: 1 }, 0.55);

        tl.to(state, { nfcConnection: 1 }, 0.62);
        tl.to(nfcLight, { intensity: 3 }, 0.62);
        tl.to('#nfc-flash', { opacity: 0.5, yoyo: true, repeat: 1 }, 0.62);
        tl.to(state, { screenBrightness: 1 }, 0.63);

        tl.to(phoneGroup.position, { x: 0.8, y: 0, z: 2 }, 0.75);
        tl.to(phoneGroup.rotation, { y: -0.2 }, 0.75);
        tl.to(artifactGroup.position, { x: -0.8, y: 0.2, z: 1 }, 0.75);
        tl.to(artifactGroup.rotation, { y: 0.5 }, 0.75);
        tl.to(camera.position, { z: 7.5 }, 0.75);

        tl.to(state, { nfcConnection: 0 }, 0.78);
        tl.to(nfcLight, { intensity: 0 }, 0.78);

        tl.to('#oracle-card', { opacity: 1, y: 0 }, 0.82);

        const vidTl = gsap.timeline({ scrollTrigger: { trigger: ".video-section", start: "top 70%" } });
        vidTl.to(".video-container", { opacity: 1, y: 0, duration: 1 });
        vidTl.to(".video-caption", { opacity: 1 }, "-=0.5");

        const buyTl = gsap.timeline({ scrollTrigger: { trigger: ".video-section", start: "center bottom" } });
        buyTl.to('#purchase-bar', { y: 0, onStart: () => document.getElementById('purchase-bar')?.classList.add('visible') });

        // === RENDER LOOP ===
        const clock = new THREE.Clock();
        let animationId: number;
        function animate() {
            state.time = clock.getElapsedTime();

            state.mouse.x += (state.targetMouse.x - state.mouse.x) * 0.05;
            state.mouse.y += (state.targetMouse.y - state.mouse.y) * 0.05;
            mainGroup.rotation.y = state.mouse.x * 0.08;
            mainGroup.rotation.x = state.mouse.y * 0.08;

            if (artifactGroup.visible) {
                artifactGroup.position.y += Math.sin(state.time) * 0.001;
                orb.material.uniforms.uTime.value = state.time;
            }

            if (phoneGroup.visible) {
                drawScreen(state.screenBrightness, state.time, state.nfcConnection > 0.5);

                if (state.nfcConnection > 0) {
                    const p1 = new THREE.Vector3(); artifactGroup.getWorldPosition(p1);
                    const p2 = new THREE.Vector3(); phoneGroup.getWorldPosition(p2);
                    const pos = arcParts.geometry.attributes.position.array as Float32Array;
                    for (let i = 0; i < arcCount; i++) {
                        const t = i / arcCount;
                        const v = new THREE.Vector3().lerpVectors(p1, p2, t);
                        v.x += (Math.random() - 0.5) * 0.2; v.y += (Math.random() - 0.5) * 0.3;
                        pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
                    }
                    arcParts.geometry.attributes.position.needsUpdate = true;
                    // @ts-ignore
                    arcParts.material.opacity = state.nfcConnection;
                } else {
                    // @ts-ignore
                    arcParts.material.opacity = 0;
                }
            }

            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        }

        const handleMouseMove = (e: MouseEvent) => {
            state.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            state.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            const btn = document.getElementById('magnetic-btn');
            if (btn) {
                const r = btn.getBoundingClientRect();
                const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
                if (dist < 100) gsap.to(btn, { x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 0.5 });
                else gsap.to(btn, { x: 0, y: 0, duration: 0.5 });
            }
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            lenis.destroy();
            ScrollTrigger.getAll().forEach(t => t.kill());
            if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div className="home-container">
            {showLoader && (
                <div className="loader" id="loader" style={{ opacity: showLoader ? 1 : 0 }}>
                    <div className="brand">Stone Tails</div>
                    <div className="loader-bar-container">
                        <div className="loader-bar" id="loader-bar" style={{ width: `${loaderProgress}%` }}></div>
                    </div>
                </div>
            )}

            <div className="vignette"></div>
            <div className="nfc-flash" id="nfc-flash"></div>

            <nav className="nav">
                <div className="brand">Stone Tails</div>
                <div className="edition-tag">No. 001 / 100</div>
            </nav>

            <div id="canvas-container" ref={containerRef}></div>

            <main>
                <section className="hero-section">
                    <div className="content-wrapper hero-content" id="hero-content">
                        <h1 className="hero-title">
                            <span className="line"><span className="word">Wear</span></span>
                            <span className="line"><span className="word">Wisdom</span></span>
                        </h1>
                        <p className="hero-tagline">Philosophy you can touch</p>
                    </div>
                </section>

                <section>
                    <div className="content-wrapper">
                        <div className="text-block left">
                            <span className="eyebrow">The Barrier</span>
                            <h2 className="section-title">Solid as<br />Memory</h2>
                            <p>Hewn from volcanic basalt. <strong>Grey. Dense. Unyielding.</strong> A monument to the weight of
                                history that we carry, waiting to be broken open.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="content-wrapper">
                        <div className="text-block right">
                            <span className="eyebrow">The Artifact</span>
                            <h2 className="section-title">Living<br />Violet</h2>
                            <p>Suspended in pewter, a core of <strong>luminescent energy</strong> pulses with the rhythm of
                                thought. It doesn't just glow; it communicates.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="content-wrapper">
                        <div className="connection-text" id="connection-text">
                            <span className="eyebrow" style={{ justifyContent: 'center' }}>The Connection</span>
                            <h2 className="section-title">Awaken<br />The Mentor</h2>
                            <p>Bring your phone close to bridge the gap.</p>
                        </div>
                    </div>
                </section>

                <section className="interaction-stage"></section>

                <section className="oracle-section">
                    <div className="content-wrapper">
                        <div className="oracle-card" id="oracle-card">
                            <span className="eyebrow">The Oracle Speaks</span>
                            <p className="quote">"You have power over your mind—not outside events. Realize this, and you will find
                                strength."</p>
                            <span className="author">Marcus Aurelius</span>
                            <Link to="/talk" className="btn-talk">Talk to Marcus →</Link>
                        </div>
                    </div>
                </section>

                <section className="video-section">
                    <div className="content-wrapper">
                        <div className="video-wrapper">
                            <div className="video-container">
                                <video
                                    className="video-placeholder"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                >
                                    <source src={productDemoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            <div className="video-caption">Artifact in Motion</div>
                        </div>
                    </div>
                </section>
            </main>

            <div className="purchase-bar" id="purchase-bar">
                <div className="purchase-info">
                    <h3>The Artifact — Series One</h3>
                    <span className="purchase-meta">Limited to 100 pieces · Ships Feb 2026</span>
                </div>
                <button className="btn-primary">Own It — $299</button>
            </div>
        </div>
    );
};

export default Home;
