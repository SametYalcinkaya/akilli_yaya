import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";

// ==================== SABITLER ====================
const ROAD_WIDTH = 8;
const ROAD_LENGTH = 50;
const CROSSWALK_WIDTH = 4;
const GREEN_TIME = 10;
const YELLOW_TIME = 2;
const CAR_SPEED = 12;
const PED_SPEED = 2;

// ==================== YOL ====================
function Road() {
    return (
        <group>
            {/* Ana zemin (çim) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#2d5a27" />
            </mesh>

            {/* Kuzey-Güney yolu */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
                <meshStandardMaterial color="#333333" />
            </mesh>

            {/* Doğu-Batı yolu */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[ROAD_LENGTH, ROAD_WIDTH]} />
                <meshStandardMaterial color="#333333" />
            </mesh>

            {/* Yol orta çizgileri */}
            <RoadLines />

            {/* Yaya geçitleri */}
            <Crosswalk position={[0, 0.01, ROAD_WIDTH / 2 + CROSSWALK_WIDTH / 2]} rotation={0} />
            <Crosswalk position={[0, 0.01, -ROAD_WIDTH / 2 - CROSSWALK_WIDTH / 2]} rotation={0} />
            <Crosswalk position={[ROAD_WIDTH / 2 + CROSSWALK_WIDTH / 2, 0.01, 0]} rotation={Math.PI / 2} />
            <Crosswalk position={[-ROAD_WIDTH / 2 - CROSSWALK_WIDTH / 2, 0.01, 0]} rotation={Math.PI / 2} />
        </group>
    );
}

function RoadLines() {
    const linePositions = useMemo(() => {
        const positions = [];
        // Kuzey-Güney orta çizgi (kavşak dışında)
        for (let z = ROAD_WIDTH + 2; z < ROAD_LENGTH / 2; z += 3) {
            positions.push([0, 0.02, z]);
            positions.push([0, 0.02, -z]);
        }
        // Doğu-Batı orta çizgi (kavşak dışında)
        for (let x = ROAD_WIDTH + 2; x < ROAD_LENGTH / 2; x += 3) {
            positions.push([x, 0.02, 0]);
            positions.push([-x, 0.02, 0]);
        }
        return positions;
    }, []);

    return (
        <>
            {linePositions.map((pos, i) => (
                <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.3, 1.5]} />
                    <meshStandardMaterial color="#FFD700" />
                </mesh>
            ))}
        </>
    );
}

function Crosswalk({ position, rotation }) {
    const stripes = useMemo(() => {
        const arr = [];
        for (let i = -3; i <= 3; i++) {
            arr.push(i * 1.0);
        }
        return arr;
    }, []);

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {stripes.map((offset, i) => (
                <mesh key={i} position={[offset, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.6, CROSSWALK_WIDTH - 0.5]} />
                    <meshStandardMaterial color="#FFFFFF" />
                </mesh>
            ))}
        </group>
    );
}

// ==================== TRAFİK IŞIĞI ====================
function TrafficLightPole({ position, rotation, carLight, pedLight, label }) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Direk */}
            <mesh position={[0, 2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 4]} />
                <meshStandardMaterial color="#444444" />
            </mesh>

            {/* Araç ışığı kutusu */}
            <group position={[0, 3.5, 0.3]}>
                <mesh castShadow>
                    <boxGeometry args={[0.8, 2, 0.5]} />
                    <meshStandardMaterial color="#222222" />
                </mesh>
                {/* Kırmızı */}
                <mesh position={[0, 0.6, 0.26]}>
                    <circleGeometry args={[0.25, 32]} />
                    <meshStandardMaterial
                        color={carLight === "red" ? "#ff0000" : "#330000"}
                        emissive={carLight === "red" ? "#ff0000" : "#000000"}
                        emissiveIntensity={carLight === "red" ? 2 : 0}
                    />
                </mesh>
                {/* Sarı */}
                <mesh position={[0, 0, 0.26]}>
                    <circleGeometry args={[0.25, 32]} />
                    <meshStandardMaterial
                        color={carLight === "yellow" ? "#ffff00" : "#333300"}
                        emissive={carLight === "yellow" ? "#ffff00" : "#000000"}
                        emissiveIntensity={carLight === "yellow" ? 2 : 0}
                    />
                </mesh>
                {/* Yeşil */}
                <mesh position={[0, -0.6, 0.26]}>
                    <circleGeometry args={[0.25, 32]} />
                    <meshStandardMaterial
                        color={carLight === "green" ? "#00ff00" : "#003300"}
                        emissive={carLight === "green" ? "#00ff00" : "#000000"}
                        emissiveIntensity={carLight === "green" ? 2 : 0}
                    />
                </mesh>
            </group>

            {/* Yaya ışığı kutusu */}
            <group position={[0.6, 2.5, 0.3]}>
                <mesh castShadow>
                    <boxGeometry args={[0.5, 1.2, 0.4]} />
                    <meshStandardMaterial color="#222222" />
                </mesh>
                {/* Kırmızı yaya */}
                <mesh position={[0, 0.3, 0.21]}>
                    <circleGeometry args={[0.18, 32]} />
                    <meshStandardMaterial
                        color={pedLight === "red" ? "#ff0000" : "#330000"}
                        emissive={pedLight === "red" ? "#ff0000" : "#000000"}
                        emissiveIntensity={pedLight === "red" ? 1.5 : 0}
                    />
                </mesh>
                {/* Yeşil yaya */}
                <mesh position={[0, -0.3, 0.21]}>
                    <circleGeometry args={[0.18, 32]} />
                    <meshStandardMaterial
                        color={pedLight === "green" ? "#00ff00" : "#003300"}
                        emissive={pedLight === "green" ? "#00ff00" : "#000000"}
                        emissiveIntensity={pedLight === "green" ? 1.5 : 0}
                    />
                </mesh>
            </group>

            {/* Etiket */}
            <Text
                position={[0, 4.8, 0]}
                fontSize={0.5}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {label}
            </Text>
        </group>
    );
}

// ==================== ARAÇ ====================
function Car({ position, rotation, color }) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Gövde */}
            <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[1.8, 0.6, 3.5]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Kabin */}
            <mesh position={[0, 0.9, -0.2]} castShadow>
                <boxGeometry args={[1.6, 0.5, 2]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Camlar */}
            <mesh position={[0, 0.9, 0.5]}>
                <boxGeometry args={[1.4, 0.4, 0.1]} />
                <meshStandardMaterial color="#87CEEB" transparent opacity={0.7} />
            </mesh>
            {/* Tekerlekler */}
            <Wheel position={[0.9, 0.2, 1]} />
            <Wheel position={[-0.9, 0.2, 1]} />
            <Wheel position={[0.9, 0.2, -1]} />
            <Wheel position={[-0.9, 0.2, -1]} />
            {/* Farlar */}
            <mesh position={[0.5, 0.4, 1.76]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#FFFF99" emissive="#FFFF00" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[-0.5, 0.4, 1.76]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#FFFF99" emissive="#FFFF00" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

function Wheel({ position }) {
    return (
        <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
            <meshStandardMaterial color="#111111" />
        </mesh>
    );
}

// ==================== YAYA ====================
function Pedestrian({ position, category }) {
    const colors = {
        adult: "#3498db",
        elderly: "#9b59b6",
        child: "#e74c3c",
        disabled: "#f39c12",
    };
    const heights = {
        adult: 1.7,
        elderly: 1.6,
        child: 1.2,
        disabled: 1.3,
    };

    const color = colors[category] || colors.adult;
    const height = heights[category] || heights.adult;

    return (
        <group position={position}>
            {/* Gövde */}
            <mesh position={[0, height / 2, 0]} castShadow>
                <capsuleGeometry args={[0.25, height - 0.5, 8, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Kafa */}
            <mesh position={[0, height, 0]} castShadow>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color="#FFDAB9" />
            </mesh>
            {/* Kategori etiketi */}
            <Text
                position={[0, height + 0.5, 0]}
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="black"
            >
                {category === "elderly" ? "👴" : category === "child" ? "👶" : category === "disabled" ? "♿" : "🚶"}
            </Text>
        </group>
    );
}

// ==================== SİMÜLASYON MANTIĞI ====================
function SimulationLogic({ onUpdate }) {
    const stateRef = useRef({
        phase: 0, // 0: NS yeşil, 1: NS sarı, 2: EW yeşil, 3: EW sarı
        timer: GREEN_TIME,
        cars: [],
        pedestrians: [],
        carSpawnTimer: 2,
        pedSpawnTimer: 3,
    });

    const carIdRef = useRef(0);
    const pedIdRef = useRef(0);

    const getCarLight = (direction) => {
        const phase = stateRef.current.phase;
        if (direction === "NS") {
            if (phase === 0) return "green";
            if (phase === 1) return "yellow";
            return "red";
        } else {
            if (phase === 2) return "green";
            if (phase === 3) return "yellow";
            return "red";
        }
    };

    const getPedLight = (crossingDir) => {
        const phase = stateRef.current.phase;
        // Yaya yatay geçecekse (EW yönünde), NS araçlar durmalı
        if (crossingDir === "EW") {
            return (phase === 2 || phase === 3) ? "green" : "red";
        } else {
            // Dikey geçiş (NS yönünde), EW araçlar durmalı
            return (phase === 0 || phase === 1) ? "green" : "red";
        }
    };

    const spawnCar = () => {
        const directions = [
            { dir: "north", x: 2, z: 30, rotation: Math.PI, axis: "NS" },
            { dir: "south", x: -2, z: -30, rotation: 0, axis: "NS" },
            { dir: "east", x: -30, z: 2, rotation: -Math.PI / 2, axis: "EW" },
            { dir: "west", x: 30, z: -2, rotation: Math.PI / 2, axis: "EW" },
        ];
        const d = directions[Math.floor(Math.random() * directions.length)];
        const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

        stateRef.current.cars.push({
            id: carIdRef.current++,
            x: d.x,
            z: d.z,
            rotation: d.rotation,
            dir: d.dir,
            axis: d.axis,
            color: colors[Math.floor(Math.random() * colors.length)],
            stopped: false,
        });
    };

    const spawnPedestrian = () => {
        const crossings = [
            // Kuzey yaya geçidi (yatay)
            { x: -12, z: ROAD_WIDTH / 2 + 2, tx: 12, tz: ROAD_WIDTH / 2 + 2, crossDir: "EW" },
            { x: 12, z: ROAD_WIDTH / 2 + 2, tx: -12, tz: ROAD_WIDTH / 2 + 2, crossDir: "EW" },
            // Güney yaya geçidi (yatay)
            { x: -12, z: -ROAD_WIDTH / 2 - 2, tx: 12, tz: -ROAD_WIDTH / 2 - 2, crossDir: "EW" },
            { x: 12, z: -ROAD_WIDTH / 2 - 2, tx: -12, tz: -ROAD_WIDTH / 2 - 2, crossDir: "EW" },
            // Doğu yaya geçidi (dikey)
            { x: ROAD_WIDTH / 2 + 2, z: -12, tx: ROAD_WIDTH / 2 + 2, tz: 12, crossDir: "NS" },
            { x: ROAD_WIDTH / 2 + 2, z: 12, tx: ROAD_WIDTH / 2 + 2, tz: -12, crossDir: "NS" },
            // Batı yaya geçidi (dikey)
            { x: -ROAD_WIDTH / 2 - 2, z: -12, tx: -ROAD_WIDTH / 2 - 2, tz: 12, crossDir: "NS" },
            { x: -ROAD_WIDTH / 2 - 2, z: 12, tx: -ROAD_WIDTH / 2 - 2, tz: -12, crossDir: "NS" },
        ];
        const c = crossings[Math.floor(Math.random() * crossings.length)];
        const categories = ["adult", "adult", "elderly", "child", "disabled"];

        stateRef.current.pedestrians.push({
            id: pedIdRef.current++,
            x: c.x,
            z: c.z,
            targetX: c.tx,
            targetZ: c.tz,
            crossDir: c.crossDir,
            category: categories[Math.floor(Math.random() * categories.length)],
            state: "waiting",
        });
    };

    useFrame((_, delta) => {
        const state = stateRef.current;
        const dt = Math.min(delta, 0.1);

        // Işık zamanlayıcı
        state.timer -= dt;
        if (state.timer <= 0) {
            state.phase = (state.phase + 1) % 4;
            state.timer = state.phase % 2 === 0 ? GREEN_TIME : YELLOW_TIME;
        }

        // Araç spawn
        state.carSpawnTimer -= dt;
        if (state.carSpawnTimer <= 0) {
            state.carSpawnTimer = 2 + Math.random() * 2;
            spawnCar();
        }

        // Yaya spawn
        state.pedSpawnTimer -= dt;
        if (state.pedSpawnTimer <= 0) {
            state.pedSpawnTimer = 3 + Math.random() * 3;
            spawnPedestrian();
        }

        // Araçları güncelle
        const STOP_LINE = ROAD_WIDTH / 2 + CROSSWALK_WIDTH + 2;
        const newCars = [];

        for (const car of state.cars) {
            const light = getCarLight(car.axis);
            let shouldStop = false;

            // Dur çizgisi kontrolü - SADECE kırmızı veya sarı ışıkta dur
            if (light !== "green") {
                const margin = 8;
                if (car.dir === "north" && car.z > STOP_LINE && car.z < STOP_LINE + margin) shouldStop = true;
                if (car.dir === "south" && car.z < -STOP_LINE && car.z > -STOP_LINE - margin) shouldStop = true;
                if (car.dir === "east" && car.x < -STOP_LINE && car.x > -STOP_LINE - margin) shouldStop = true;
                if (car.dir === "west" && car.x > STOP_LINE && car.x < STOP_LINE + margin) shouldStop = true;
            }

            // Yaya geçidinde yaya var mı kontrol et - ARAÇ YAYANIN ÜZERİNDEN GEÇMESİN
            for (const ped of state.pedestrians) {
                if (ped.state === "crossing") {
                    const pedInPath =
                        (car.dir === "north" || car.dir === "south") &&
                        Math.abs(car.x - ped.x) < 3 &&
                        Math.abs(car.z - ped.z) < 6;
                    const pedInPathEW =
                        (car.dir === "east" || car.dir === "west") &&
                        Math.abs(car.z - ped.z) < 3 &&
                        Math.abs(car.x - ped.x) < 6;

                    if (pedInPath || pedInPathEW) {
                        shouldStop = true;
                        break;
                    }
                }
            }

            car.stopped = shouldStop;

            if (!shouldStop) {
                const speed = CAR_SPEED * dt;
                if (car.dir === "north") car.z -= speed;
                if (car.dir === "south") car.z += speed;
                if (car.dir === "east") car.x += speed;
                if (car.dir === "west") car.x -= speed;
            }

            // Ekranda mı?
            if (Math.abs(car.x) < 40 && Math.abs(car.z) < 40) {
                newCars.push(car);
            }
        }
        state.cars = newCars;

        // Yayaları güncelle
        const newPeds = [];
        for (const ped of state.pedestrians) {
            const pedLight = getPedLight(ped.crossDir);

            if (ped.state === "waiting") {
                if (pedLight === "green") {
                    ped.state = "crossing";
                }
                newPeds.push(ped);
            } else if (ped.state === "crossing") {
                const dx = ped.targetX - ped.x;
                const dz = ped.targetZ - ped.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 0.5) {
                    // Kategori bazlı hız
                    const speedMult = {
                        adult: 1.0,
                        elderly: 0.6,
                        child: 0.8,
                        disabled: 0.5,
                    };
                    const speed = PED_SPEED * (speedMult[ped.category] || 1.0) * dt;
                    ped.x += (dx / dist) * speed;
                    ped.z += (dz / dist) * speed;
                    newPeds.push(ped);
                }
                // Hedefe ulaştı = listeden çıkar
            }
        }
        state.pedestrians = newPeds;

        // UI güncelle
        onUpdate({
            phase: state.phase,
            timer: state.timer,
            cars: [...state.cars],
            pedestrians: [...state.pedestrians],
            lights: {
                NS: { car: getCarLight("NS"), ped: getPedLight("NS") },
                EW: { car: getCarLight("EW"), ped: getPedLight("EW") },
            },
        });
    });

    return null;
}

// ==================== ANA SAHNE ====================
function Scene({ simState }) {
    return (
        <>
            {/* Işıklandırma */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[20, 30, 10]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={100}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
            />

            {/* Yol ve kavşak */}
            <Road />

            {/* Trafik ışıkları */}
            <TrafficLightPole
                position={[ROAD_WIDTH / 2 + 2, 0, ROAD_WIDTH / 2 + CROSSWALK_WIDTH + 3]}
                rotation={0}
                carLight={simState.lights?.NS?.car || "red"}
                pedLight={simState.lights?.EW?.ped || "red"}
                label="Kuzey"
            />
            <TrafficLightPole
                position={[-ROAD_WIDTH / 2 - 2, 0, -ROAD_WIDTH / 2 - CROSSWALK_WIDTH - 3]}
                rotation={Math.PI}
                carLight={simState.lights?.NS?.car || "red"}
                pedLight={simState.lights?.EW?.ped || "red"}
                label="Güney"
            />
            <TrafficLightPole
                position={[-ROAD_WIDTH / 2 - CROSSWALK_WIDTH - 3, 0, ROAD_WIDTH / 2 + 2]}
                rotation={Math.PI / 2}
                carLight={simState.lights?.EW?.car || "red"}
                pedLight={simState.lights?.NS?.ped || "red"}
                label="Batı"
            />
            <TrafficLightPole
                position={[ROAD_WIDTH / 2 + CROSSWALK_WIDTH + 3, 0, -ROAD_WIDTH / 2 - 2]}
                rotation={-Math.PI / 2}
                carLight={simState.lights?.EW?.car || "red"}
                pedLight={simState.lights?.NS?.ped || "red"}
                label="Doğu"
            />

            {/* Araçlar */}
            {simState.cars?.map((car) => (
                <Car
                    key={car.id}
                    position={[car.x, 0, car.z]}
                    rotation={car.rotation}
                    color={car.color}
                />
            ))}

            {/* Yayalar */}
            {simState.pedestrians?.map((ped) => (
                <Pedestrian
                    key={ped.id}
                    position={[ped.x, 0, ped.z]}
                    category={ped.category}
                />
            ))}

            {/* Kamera kontrolleri */}
            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={15}
                maxDistance={80}
                maxPolarAngle={Math.PI / 2.2}
            />
        </>
    );
}

// ==================== ANA BİLEŞEN ====================
export function Simulation3D() {
    const [simState, setSimState] = useState({
        phase: 0,
        timer: GREEN_TIME,
        cars: [],
        pedestrians: [],
        lights: {
            NS: { car: "green", ped: "red" },
            EW: { car: "red", ped: "green" },
        },
    });

    const getPhaseText = () => {
        switch (simState.phase) {
            case 0: return "🚗 Kuzey-Güney Yeşil | 🚶 Doğu-Batı Geçebilir";
            case 1: return "🚗 Kuzey-Güney Sarı";
            case 2: return "🚗 Doğu-Batı Yeşil | 🚶 Kuzey-Güney Geçebilir";
            case 3: return "🚗 Doğu-Batı Sarı";
            default: return "";
        }
    };

    return (
        <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            {/* Üst bilgi paneli */}
            <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-center">
                <div className="bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-sm text-emerald-400 font-semibold">{getPhaseText()}</span>
                    <span className="ml-3 text-white font-bold">{Math.ceil(simState.timer)}s</span>
                </div>
                <div className="bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 flex gap-4">
                    <span className="text-xs text-slate-400">
                        🚗 Araç: <span className="text-white font-semibold">{simState.cars?.length || 0}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                        🚶 Yaya: <span className="text-white font-semibold">{simState.pedestrians?.length || 0}</span>
                    </span>
                </div>
            </div>

            {/* Açıklama */}
            <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 text-center">
                    <span className="text-xs text-slate-400">
                        🖱️ Sol tık + sürükle: Döndür | Sağ tık + sürükle: Kaydır | Scroll: Yakınlaştır
                    </span>
                </div>
            </div>

            {/* Işık durumu göstergesi */}
            <div className="absolute top-16 right-2 z-10 bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 mb-2">Işık Durumu</div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 w-8">K-G:</span>
                        <div className={`w-3 h-3 rounded-full ${simState.lights?.NS?.car === "green" ? "bg-green-500" :
                            simState.lights?.NS?.car === "yellow" ? "bg-yellow-500" : "bg-red-500"
                            }`} />
                        <span className="text-xs text-slate-500">Araç</span>
                        <div className={`w-3 h-3 rounded-full ${simState.lights?.NS?.ped === "green" ? "bg-green-500" : "bg-red-500"
                            }`} />
                        <span className="text-xs text-slate-500">Yaya</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 w-8">D-B:</span>
                        <div className={`w-3 h-3 rounded-full ${simState.lights?.EW?.car === "green" ? "bg-green-500" :
                            simState.lights?.EW?.car === "yellow" ? "bg-yellow-500" : "bg-red-500"
                            }`} />
                        <span className="text-xs text-slate-500">Araç</span>
                        <div className={`w-3 h-3 rounded-full ${simState.lights?.EW?.ped === "green" ? "bg-green-500" : "bg-red-500"
                            }`} />
                        <span className="text-xs text-slate-500">Yaya</span>
                    </div>
                </div>
            </div>

            {/* 3D Canvas */}
            <Canvas
                shadows
                camera={{ position: [25, 25, 25], fov: 50 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={["#1a1a2e"]} />
                <fog attach="fog" args={["#1a1a2e", 50, 100]} />
                <SimulationLogic onUpdate={setSimState} />
                <Scene simState={simState} />
            </Canvas>
        </div>
    );
}
