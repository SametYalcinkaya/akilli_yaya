import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Sky } from "@react-three/drei";

// ==================== SABİTLER ====================
const CATEGORIES = {
    adult: { name: "Yetişkin", emoji: "🚶", color: "#3b82f6", speed: 1.2, extraTime: 0, description: "Normal yürüyüş hızı" },
    elderly: { name: "Yaşlı", emoji: "👴", color: "#a855f7", speed: 0.6, extraTime: 5, description: "Yavaş yürüyüş, +5 saniye" },
    child: { name: "Çocuk", emoji: "👶", color: "#ef4444", speed: 0.9, extraTime: 4, description: "Küçük adımlar, +4 saniye" },
    disabled: { name: "Engelli", emoji: "♿", color: "#f59e0b", speed: 0.4, extraTime: 7, description: "Tekerlekli sandalye, +7 saniye" },
};

const ROAD_WIDTH = 12;
const GREEN_TIME = 10;
const YELLOW_TIME = 2;
const CROSSWALKS = [
    {
        id: "north",
        label: "Kuzey Yaya Geçidi",
        axis: "x",
        bounds: {
            minX: -ROAD_WIDTH / 2 - 3,
            maxX: ROAD_WIDTH / 2 + 3,
            minZ: -ROAD_WIDTH / 2 - 2,
            maxZ: -ROAD_WIDTH / 2 + 2,
        },
        camera: { position: [ROAD_WIDTH / 2 + 3, 10, ROAD_WIDTH / 2 + 5], lookAt: [0, 0, -ROAD_WIDTH / 2] },
    },
    {
        id: "south",
        label: "Güney Yaya Geçidi",
        axis: "x",
        bounds: {
            minX: -ROAD_WIDTH / 2 - 3,
            maxX: ROAD_WIDTH / 2 + 3,
            minZ: ROAD_WIDTH / 2 - 2,
            maxZ: ROAD_WIDTH / 2 + 2,
        },
        camera: { position: [-ROAD_WIDTH / 2 - 3, 10, -ROAD_WIDTH / 2 - 5], lookAt: [0, 0, ROAD_WIDTH / 2] },
    },
    {
        id: "east",
        label: "Doğu Yaya Geçidi",
        axis: "z",
        bounds: {
            minX: ROAD_WIDTH / 2 - 2,
            maxX: ROAD_WIDTH / 2 + 2,
            minZ: -ROAD_WIDTH / 2 - 3,
            maxZ: ROAD_WIDTH / 2 + 3,
        },
        camera: { position: [ROAD_WIDTH / 2 + 5, 10, -ROAD_WIDTH / 2 - 3], lookAt: [ROAD_WIDTH / 2, 0, 0] },
    },
    {
        id: "west",
        label: "Batı Yaya Geçidi",
        axis: "z",
        bounds: {
            minX: -ROAD_WIDTH / 2 - 2,
            maxX: -ROAD_WIDTH / 2 + 2,
            minZ: -ROAD_WIDTH / 2 - 3,
            maxZ: ROAD_WIDTH / 2 + 3,
        },
        camera: { position: [-ROAD_WIDTH / 2 - 5, 10, ROAD_WIDTH / 2 + 3], lookAt: [-ROAD_WIDTH / 2, 0, 0] },
    },
];

// Araç simülasyonu sabitleri
const VEHICLE_SPEED = 0.35;
const VEHICLE_SPAWN_INTERVAL = 1500; // ms
const VEHICLE_DESPAWN_DIST = 42;
const STOP_LINE = ROAD_WIDTH / 2 + 1.5; // ışık önünde duruş mesafesi
const CRASH_DISTANCE = 1.4;
const CRASH_LIFETIME = 2000; // ms

const DIR_LABELS = { north: "Kuzey", south: "Güney", east: "Doğu", west: "Batı" };

// ==================== ANA APP ====================
export default function App() {
    const [selectedCategory, setSelectedCategory] = useState("adult");
    const [playerPos, setPlayerPos] = useState({ x: 0, z: 20 });
    const [playerRot, setPlayerRot] = useState(0); // radyan, yön takibi
    const [aiDetection, setAiDetection] = useState(null);
    const [trafficPhase, setTrafficPhase] = useState(0); // 0: NS yeşil, 1: NS sarı, 2: EW yeşil, 3: EW sarı
    const [lightTimer, setLightTimer] = useState(GREEN_TIME);
    const [extendedTime, setExtendedTime] = useState(0);
    const [isExtending, setIsExtending] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const keysPressed = useRef({});

    // Klavye kontrolleri
    useEffect(() => {
        const handleKeyDown = (e) => {
            keysPressed.current[e.key.toLowerCase()] = true;
        };
        const handleKeyUp = (e) => {
            keysPressed.current[e.key.toLowerCase()] = false;
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // Oyuncu hareketi (yön + hız) – daha akıcı WASD
    useEffect(() => {
        const interval = setInterval(() => {
            const speed = CATEGORIES[selectedCategory].speed * 0.18; // bir tık hızlı
            let newX = playerPos.x;
            let newZ = playerPos.z;
            let rot = playerRot;

            const forward = keysPressed.current["w"] ? 1 : 0;
            const backward = keysPressed.current["s"] ? 1 : 0;
            const left = keysPressed.current["a"] ? 1 : 0;
            const right = keysPressed.current["d"] ? 1 : 0;

            const moveX = right - left;
            const moveZ = backward - forward;

            if (moveX !== 0 || moveZ !== 0) {
                const len = Math.hypot(moveX, moveZ);
                const nx = moveX / len;
                const nz = moveZ / len;
                newX += nx * speed;
                newZ += nz * speed;
                rot = Math.atan2(nx, nz); // dönük yön
            }

            newX = Math.max(-25, Math.min(25, newX));
            newZ = Math.max(-25, Math.min(25, newZ));

            setPlayerPos({ x: newX, z: newZ });
            setPlayerRot(rot);
        }, 16);
        return () => clearInterval(interval);
    }, [selectedCategory, playerPos, playerRot]);

    // AI Tespit - 4 yaya geçidi için kapsama
    useEffect(() => {
        const crosswalkHit = CROSSWALKS.find((c) => {
            const { minX, maxX, minZ, maxZ } = c.bounds;
            return playerPos.x >= minX && playerPos.x <= maxX && playerPos.z >= minZ && playerPos.z <= maxZ;
        });

        if (crosswalkHit) {
            const { minX, maxX, minZ, maxZ } = crosswalkHit.bounds;
            const axis = crosswalkHit.axis;
            const totalDistance = axis === "x" ? maxX - minX : maxZ - minZ;
            const traveled = axis === "x" ? playerPos.x - minX : playerPos.z - minZ;
            const positionPercent = Math.max(0, Math.min(100, (traveled / totalDistance) * 100));
            const remainingDistance = axis === "x" ? maxX - playerPos.x : maxZ - playerPos.z;
            const remainingPercent = 100 - positionPercent;
            const speedMps = CATEGORIES[selectedCategory].speed;
            const estimatedTime = Math.max(0, remainingDistance) / speedMps;

            setAiDetection({
                detected: true,
                category: selectedCategory,
                categoryInfo: CATEGORIES[selectedCategory],
                positionPercent: positionPercent.toFixed(1),
                remainingPercent: remainingPercent.toFixed(1),
                speed: speedMps.toFixed(2),
                estimatedTime: estimatedTime.toFixed(1),
                extraTime: CATEGORIES[selectedCategory].extraTime,
                decision: `+${CATEGORIES[selectedCategory].extraTime} saniye ek süre`,
                crosswalkId: crosswalkHit.id,
                crosswalkLabel: crosswalkHit.label,
                facing: playerRot,
            });

            // Işık uzatma tetikle
            if (!isExtending && CATEGORIES[selectedCategory].extraTime > 0) {
                setExtendedTime(CATEGORIES[selectedCategory].extraTime);
                setIsExtending(true);
            }
        } else {
            setAiDetection(null);
            setIsExtending(false);
            setExtendedTime(0);
        }
    }, [playerPos, selectedCategory, isExtending]);

    // Trafik ışığı döngüsü
    useEffect(() => {
        const interval = setInterval(() => {
            setLightTimer((prev) => {
                if (prev <= 0) {
                    setTrafficPhase((p) => (p + 1) % 4);
                    const nextPhase = (trafficPhase + 1) % 4;
                    const baseTime = nextPhase % 2 === 0 ? GREEN_TIME : YELLOW_TIME;
                    // Yaya geçidindeyken ve NS yeşile geçerken süre ekle
                    if (nextPhase === 0 && isExtending) {
                        return baseTime + extendedTime;
                    }
                    return baseTime;
                }
                return prev - 0.1;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [trafficPhase, isExtending, extendedTime]);

    // Araç spawn (daha yoğun, iki şerit ofset + varyant renk)
    useEffect(() => {
        const spawnVehicle = () => {
            const dirs = ["north", "south", "east", "west"]; // hareket yönü (hedef merkez)
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const id = crypto.randomUUID();
            const laneOffsets = [1.4, -1.4, 0.2];
            const laneOffset = laneOffsets[Math.floor(Math.random() * laneOffsets.length)];
            const palette = ["#60a5fa", "#f97316", "#22c55e", "#eab308", "#a855f7"];
            const color = palette[Math.floor(Math.random() * palette.length)];

            const base = {
                north: { x: laneOffset * 2, z: -VEHICLE_DESPAWN_DIST, vx: 0, vz: VEHICLE_SPEED, stop: -STOP_LINE },
                south: { x: laneOffset * 2, z: VEHICLE_DESPAWN_DIST, vx: 0, vz: -VEHICLE_SPEED, stop: STOP_LINE },
                east: { x: VEHICLE_DESPAWN_DIST, z: laneOffset * 2, vx: -VEHICLE_SPEED, vz: 0, stop: STOP_LINE },
                west: { x: -VEHICLE_DESPAWN_DIST, z: laneOffset * 2, vx: VEHICLE_SPEED, vz: 0, stop: -STOP_LINE },
            }[dir];

            setVehicles((prev) => [...prev, { id, dir, ...base, color }]);
        };

        const interval = setInterval(spawnVehicle, VEHICLE_SPAWN_INTERVAL * 0.7);
        return () => clearInterval(interval);
    }, []);

    // Araç hareketi
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setVehicles((prev) =>
                prev
                    .map((v) => {
                        // Eğer kaza olduysa animasyon süresi bitene kadar pozisyon sabit kalabilir
                        if (v.crashedAt) {
                            return { ...v, crashed: true };
                        }

                        const green = isGreenForDirection(v.dir);
                        let x = v.x;
                        let z = v.z;

                        // Duruş çizgisi kontrolü
                        if (!green) {
                            if (v.dir === "north" && z + v.vz > v.stop) z = v.stop;
                            else if (v.dir === "south" && z + v.vz < v.stop) z = v.stop;
                            else if (v.dir === "east" && x + v.vx < v.stop) x = v.stop;
                            else if (v.dir === "west" && x + v.vx > v.stop) x = v.stop;
                            else {
                                x += v.vx;
                                z += v.vz;
                            }
                        } else {
                            x += v.vx;
                            z += v.vz;
                        }

                        // Yaya ile çarpışma kontrolü
                        const dx = x - playerPos.x;
                        const dz = z - playerPos.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < CRASH_DISTANCE) {
                            return { ...v, crashed: true, crashedAt: now };
                        }

                        return { ...v, x, z };
                    })
                    // süresi dolmuş kazaları ve uzak araçları temizle
                    .filter((v) => {
                        if (v.crashedAt && now - v.crashedAt > CRASH_LIFETIME) return false;
                        return Math.abs(v.x) <= VEHICLE_DESPAWN_DIST && Math.abs(v.z) <= VEHICLE_DESPAWN_DIST;
                    })
            );
        }, 50);

        return () => clearInterval(interval);
    }, [isExtending, playerPos]);

    const getCarLight = (direction) => {
        if (direction === "NS") {
            if (trafficPhase === 0) return "green";
            if (trafficPhase === 1) return "yellow";
            return "red";
        } else {
            if (trafficPhase === 2) return "green";
            if (trafficPhase === 3) return "yellow";
            return "red";
        }
    };

    const getPedLight = () => {
        // Yayalar NS araçları dururken geçebilir (EW araçlar gidiyorken)
        return trafficPhase === 2 || trafficPhase === 3 ? "green" : "red";
    };

    const getFacingDirection = (angleRad) => {
        const a = ((angleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (a > Math.PI * 3 / 4 && a <= Math.PI * 5 / 4) return "north"; // ~pi
        if (a > Math.PI * 1 / 4 && a <= Math.PI * 3 / 4) return "east";  // ~pi/2
        if (a > Math.PI * 5 / 4 && a <= Math.PI * 7 / 4) return "west";  // ~-pi/2
        return "south"; // default 0
    };

    const facingDir = getFacingDirection(playerRot);
    const facingPedLight = getPedLight(); // hazır: ışıklar birleşik, yine de yön labelı için tutuyoruz

    const isGreenForDirection = (dir) => {
        return dir === "north" || dir === "south"
            ? getCarLight("NS") === "green"
            : getCarLight("EW") === "green";
    };

    return (
        <div className="w-full h-screen bg-slate-900 flex flex-col">
            {/* Üst Panel - Başlık ve Avatar Seçimi */}
            <header className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-white">🎮 Akıllı Yaya Güvenliği - İnteraktif Demo</h1>
                        <p className="text-slate-400 text-sm">WASD tuşları ile avatarı hareket ettirin</p>
                    </div>

                    {/* Avatar Seçimi */}
                    <div className="flex gap-2">
                        {Object.entries(CATEGORIES).map(([key, cat]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCategory(key)}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${selectedCategory === key
                                    ? "bg-emerald-500 text-white scale-105 shadow-lg shadow-emerald-500/30"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                    }`}
                            >
                                <span className="text-xl mr-2">{cat.emoji}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Ana İçerik */}
            <main className="flex-1 flex">
                {/* 3D Sahne */}
                <div className="flex-1 relative">
                    <Canvas shadows camera={{ position: [0, 30, 35], fov: 50 }}>
                        <Scene
                            playerPos={playerPos}
                            selectedCategory={selectedCategory}
                            playerRot={playerRot}
                            trafficPhase={trafficPhase}
                            getCarLight={getCarLight}
                            getPedLight={getPedLight}
                            aiDetection={aiDetection}
                            vehicles={vehicles}
                            facingDir={facingDir}
                            facingPedLight={facingPedLight}
                        />
                    </Canvas>

                    {/* Kontrol bilgisi overlay */}
                    <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur rounded-lg p-4 border border-slate-700">
                        <div className="text-white font-semibold mb-2">🎮 Kontroller</div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                            <div></div>
                            <div className="bg-slate-700 rounded px-3 py-1 text-white font-mono">W</div>
                            <div></div>
                            <div className="bg-slate-700 rounded px-3 py-1 text-white font-mono">A</div>
                            <div className="bg-slate-700 rounded px-3 py-1 text-white font-mono">S</div>
                            <div className="bg-slate-700 rounded px-3 py-1 text-white font-mono">D</div>
                        </div>
                        <p className="text-slate-400 text-xs mt-2">Yaya geçidine doğru yürüyün</p>
                    </div>

                    {/* Işık uzatma bildirimi */}
                    {isExtending && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
                            ⏱️ Işık Süresi Uzatıldı: +{extendedTime} saniye
                        </div>
                    )}
                </div>

                {/* Sağ Panel - AI ve Trafik Bilgileri */}
                <aside className="w-96 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
                    {/* Seçili Avatar Bilgisi */}
                    <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700">
                        <h3 className="text-slate-400 text-sm font-semibold mb-3">📋 SEÇİLİ AVATAR</h3>
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                                style={{ backgroundColor: CATEGORIES[selectedCategory].color + "30" }}
                            >
                                {CATEGORIES[selectedCategory].emoji}
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">{CATEGORIES[selectedCategory].name}</div>
                                <div className="text-slate-400 text-sm">{CATEGORIES[selectedCategory].description}</div>
                                <div className="text-emerald-400 text-sm mt-1">
                                    Hız: {CATEGORIES[selectedCategory].speed} m/s
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Tespit Paneli */}
                    <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700">
                        <h3 className="text-slate-400 text-sm font-semibold mb-3">🤖 YAPAY ZEKA TESPİT</h3>
                        {aiDetection ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-emerald-400 font-semibold">TESPİT EDİLDİ</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-800 rounded-lg p-3">
                                        <div className="text-slate-500 text-xs">Sınıf</div>
                                        <div className="text-white font-bold">{aiDetection.categoryInfo.name}</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-3">
                                        <div className="text-slate-500 text-xs">Geçit</div>
                                        <div className="text-white font-bold">{aiDetection.crosswalkLabel}</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-3">
                                        <div className="text-slate-500 text-xs">Güven</div>
                                        <div className="text-white font-bold">%98.5</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-3">
                                        <div className="text-slate-500 text-xs">Konum</div>
                                        <div className="text-white font-bold">%{aiDetection.positionPercent}</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-3">
                                        <div className="text-slate-500 text-xs">Hız</div>
                                        <div className="text-white font-bold">{aiDetection.speed} m/s</div>
                                    </div>
                                </div>

                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-slate-500 text-xs mb-1">Geçiş İlerlemesi</div>
                                    <div className="w-full bg-slate-700 rounded-full h-3">
                                        <div
                                            className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                                            style={{ width: `${aiDetection.positionPercent}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-slate-500 text-xs">Tahmini Geçiş Süresi</div>
                                    <div className="text-amber-400 font-bold text-xl">{aiDetection.estimatedTime} sn</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-slate-600 text-4xl mb-2">👁️</div>
                                <div className="text-slate-500">Yaya geçidine girin</div>
                                <div className="text-slate-600 text-sm">AI tespit başlayacak</div>
                            </div>
                        )}
                    </div>

                    {/* Karar Algoritması */}
                    <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-700">
                        <h3 className="text-slate-400 text-sm font-semibold mb-3">⚙️ KARAR ALGORİTMASI</h3>
                        {aiDetection ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Temel Süre:</span>
                                    <span className="text-white">{GREEN_TIME} sn</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Kategori Ek Süre:</span>
                                    <span className="text-emerald-400">+{aiDetection.extraTime} sn</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Tahmini İhtiyaç:</span>
                                    <span className="text-amber-400">{aiDetection.estimatedTime} sn</span>
                                </div>
                                <hr className="border-slate-700" />
                                <div className="flex justify-between font-bold">
                                    <span className="text-white">KARAR:</span>
                                    <span className="text-emerald-400">{aiDetection.decision}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 text-center py-4">Tespit bekleniyor...</div>
                        )}
                    </div>

                    {/* Trafik Işık Durumu */}
                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-slate-400 text-sm font-semibold mb-3">🚦 TRAFİK IŞIK DURUMU</h3>

                        <div className="flex justify-center mb-4">
                            <div className="text-4xl font-bold text-white">{Math.ceil(lightTimer)} sn</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Kuzey-Güney */}
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                                <div className="text-slate-400 text-xs mb-2">Kuzey-Güney</div>
                                <div className="flex justify-center gap-2">
                                    <div className={`w-4 h-4 rounded-full ${getCarLight("NS") === "red" ? "bg-red-500 shadow-lg shadow-red-500/50" : "bg-red-900"}`}></div>
                                    <div className={`w-4 h-4 rounded-full ${getCarLight("NS") === "yellow" ? "bg-yellow-500 shadow-lg shadow-yellow-500/50" : "bg-yellow-900"}`}></div>
                                    <div className={`w-4 h-4 rounded-full ${getCarLight("NS") === "green" ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-green-900"}`}></div>
                                </div>
                            </div>

                            {/* Doğu-Batı */}
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                                <div className="text-slate-400 text-xs mb-2">Doğu-Batı</div>
                                <div className="flex justify-center gap-2">
                                    <div className={`w-4 h-4 rounded-full ${getCarLight("EW") === "red" ? "bg-red-500 shadow-lg shadow-red-500/50" : "bg-red-900"}`}></div>
                                    <div className={`w-4 h-4 rounded-full ${getCarLight("EW") === "yellow" ? "bg-yellow-500 shadow-lg shadow-yellow-500/50" : "bg-yellow-900"}`}></div>
                                    <div className={`w-4 h-4 rounded-full ${getCarLight("EW") === "green" ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-green-900"}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Yaya Işığı */}
                        <div className="mt-3 bg-slate-800 rounded-lg p-3 text-center">
                            <div className="text-slate-400 text-xs mb-2">Yaya Işığı</div>
                            <div className="flex justify-center gap-4">
                                <div className={`w-6 h-6 rounded-full ${getPedLight() === "red" ? "bg-red-500 shadow-lg shadow-red-500/50" : "bg-red-900"}`}></div>
                                <div className={`w-6 h-6 rounded-full ${getPedLight() === "green" ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-green-900"}`}></div>
                            </div>
                            <div className={`mt-2 text-sm font-semibold ${getPedLight() === "green" ? "text-green-400" : "text-red-400"}`}>
                                {getPedLight() === "green" ? "GEÇEBİLİRSİNİZ" : "BEKLEYİN"}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}

// ==================== 3D SAHNE ====================
function Scene({ playerPos, selectedCategory, playerRot, trafficPhase, getCarLight, getPedLight, aiDetection, vehicles, facingDir, facingPedLight }) {
    return (
        <>
            {/* Gökyüzü ve Işık */}
            <Sky sunPosition={[100, 20, 100]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[50, 50, 25]} intensity={1} castShadow />

            {/* Zemin - Çim */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#228B22" />
            </mesh>

            {/* Yollar */}
            <Road />

            {/* Yaya Geçidi */}
            <Crosswalk />

            {/* Trafik Işıkları */}
            <TrafficLight position={[ROAD_WIDTH / 2 + 3, 0, ROAD_WIDTH / 2 + 5]} rotation={0} carLight={getCarLight("NS")} pedLight={getPedLight()} />
            <TrafficLight position={[-ROAD_WIDTH / 2 - 3, 0, -ROAD_WIDTH / 2 - 5]} rotation={Math.PI} carLight={getCarLight("NS")} pedLight={getPedLight()} />
            <TrafficLight position={[ROAD_WIDTH / 2 + 5, 0, -ROAD_WIDTH / 2 - 3]} rotation={-Math.PI / 2} carLight={getCarLight("EW")} pedLight={getPedLight()} />
            <TrafficLight position={[-ROAD_WIDTH / 2 - 5, 0, ROAD_WIDTH / 2 + 3]} rotation={Math.PI / 2} carLight={getCarLight("EW")} pedLight={getPedLight()} />

            {/* Araçlar */}
            <Vehicles vehicles={vehicles} />

            {/* Oyuncu Avatar */}
            <Avatar position={[playerPos.x, 0, playerPos.z]} rotationY={playerRot} category={selectedCategory} />

            {/* Yaya yönü / ışık bildirimi */}
            <FacingIndicator position={[playerPos.x, 2.6, playerPos.z]} light={facingPedLight} dir={facingDir} />

            {/* AI Kameralar - her ışık üstünde */}
            {CROSSWALKS.map((cw) => (
                <AiCamera
                    key={cw.id}
                    position={cw.camera.position}
                    lookAt={cw.camera.lookAt}
                    active={aiDetection?.crosswalkId === cw.id}
                    label={cw.label}
                />
            ))}

            {/* Kamera Kontrol */}
            <OrbitControls enablePan={true} enableZoom={true} maxPolarAngle={Math.PI / 2.2} minDistance={15} maxDistance={60} />
        </>
    );
}

// ==================== YOL ====================
function Road() {
    return (
        <group>
            {/* Kuzey-Güney Yolu */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[ROAD_WIDTH, 60]} />
                <meshStandardMaterial color="#333333" />
            </mesh>

            {/* Doğu-Batı Yolu */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[60, ROAD_WIDTH]} />
                <meshStandardMaterial color="#333333" />
            </mesh>

            {/* Yol Çizgileri */}
            <RoadLines />
        </group>
    );
}

function RoadLines() {
    const lines = [];
    // Dikey orta çizgi
    for (let z = ROAD_WIDTH + 2; z < 30; z += 4) {
        lines.push([0, 0.02, z], [0, 0.02, -z]);
    }
    // Yatay orta çizgi
    for (let x = ROAD_WIDTH + 2; x < 30; x += 4) {
        lines.push([x, 0.02, 0], [-x, 0.02, 0]);
    }

    return (
        <>
            {lines.map((pos, i) => (
                <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.3, 2]} />
                    <meshStandardMaterial color="#FFD700" />
                </mesh>
            ))}
        </>
    );
}

// ==================== ARAÇLAR ====================
function Vehicles({ vehicles }) {
    return (
        <group>
            {vehicles.map((v) => (
                <group key={v.id} position={[v.x, 0.4, v.z]} rotation={[0, getVehicleRotation(v.dir), 0]}>
                    {v.crashed ? (
                        <CrashEffect />
                    ) : (
                        <>
                            <mesh castShadow>
                                <boxGeometry args={[1.4, 0.8, 3]} />
                                <meshStandardMaterial color={v.color} />
                            </mesh>
                            <mesh position={[0, 0.1, 1]}>
                                <boxGeometry args={[1.2, 0.4, 0.8]} />
                                <meshStandardMaterial color="#111827" />
                            </mesh>
                            {/* Farlar */}
                            <mesh position={[0.5, 0.15, 1.6]}>
                                <sphereGeometry args={[0.08, 10, 10]} />
                                <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.8} />
                            </mesh>
                            <mesh position={[-0.5, 0.15, 1.6]}>
                                <sphereGeometry args={[0.08, 10, 10]} />
                                <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.8} />
                            </mesh>
                        </>
                    )}
                </group>
            ))}
        </group>
    );
}

function getVehicleRotation(dir) {
    switch (dir) {
        case "north": return Math.PI;
        case "south": return 0;
        case "east": return Math.PI / 2;
        case "west": return -Math.PI / 2;
        default: return 0;
    }
}

function FacingIndicator({ position, light, dir }) {
    const color = light === "green" ? "#22c55e" : "#ef4444";
    const label = light === "green" ? "GEÇ" : "BEKLE";
    return (
        <group position={position}>
            <Text
                position={[0, 0.4, 0]}
                fontSize={0.5}
                color={color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.06}
                outlineColor="#0f172a"
            >
                {DIR_LABELS[dir]} • {label}
            </Text>
        </group>
    );
}

function CrashEffect() {
    const ref = useRef();
    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime;
        ref.current.rotation.y = t * 6;
        ref.current.position.y = 0.4 + Math.sin(t * 8) * 0.2;
    });

    return (
        <group ref={ref}>
            <mesh>
                <dodecahedronGeometry args={[0.9, 0]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} transparent opacity={0.8} />
            </mesh>
            <Text position={[0, 1.2, 0]} fontSize={0.45} color="#f87171" anchorX="center" anchorY="middle">
                KAZA!
            </Text>
        </group>
    );
}

// ==================== YAYA GEÇİDİ ====================
function Crosswalk() {
    const stripeMeshes = [];

    // Kuzey ve Güney geçitleri (x yönünde çizgiler)
    for (let x = -ROAD_WIDTH / 2 + 0.8; x < ROAD_WIDTH / 2; x += 1.4) {
        stripeMeshes.push({ position: [x, 0, -ROAD_WIDTH / 2], rotation: [-Math.PI / 2, 0, 0], size: [0.8, 4.5] });
        stripeMeshes.push({ position: [x, 0, ROAD_WIDTH / 2], rotation: [-Math.PI / 2, 0, 0], size: [0.8, 4.5] });
    }

    // Doğu ve Batı geçitleri (z yönünde çizgiler)
    for (let z = -ROAD_WIDTH / 2 + 0.8; z < ROAD_WIDTH / 2; z += 1.4) {
        stripeMeshes.push({ position: [ROAD_WIDTH / 2, 0, z], rotation: [-Math.PI / 2, 0, 0], size: [0.8, 4.5] });
        stripeMeshes.push({ position: [-ROAD_WIDTH / 2, 0, z], rotation: [-Math.PI / 2, 0, 0], size: [0.8, 4.5] });
    }

    return (
        <group position={[0, 0.01, 0]}>
            {stripeMeshes.map((s, i) => (
                <mesh key={i} position={s.position} rotation={s.rotation}>
                    <planeGeometry args={s.size} />
                    <meshStandardMaterial color="#FFFFFF" />
                </mesh>
            ))}

            {/* Sınır şeritleri */}
            {CROSSWALKS.map((cw, i) => {
                const { minX, maxX, minZ, maxZ } = cw.bounds;
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;
                const sizeX = Math.abs(maxX - minX) + 0.2;
                const sizeZ = Math.abs(maxZ - minZ) + 0.2;
                return (
                    <mesh key={`border-${i}`} position={[centerX, 0.005, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[sizeX, sizeZ]} />
                        <meshStandardMaterial color="#FFFF00" transparent opacity={0.25} />
                    </mesh>
                );
            })}
        </group>
    );
}

// ==================== TRAFİK IŞIĞI ====================
function TrafficLight({ position, rotation, carLight, pedLight }) {
    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Direk */}
            <mesh position={[0, 2.5, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 5]} />
                <meshStandardMaterial color="#444444" />
            </mesh>

            {/* Araç Işığı Kutusu */}
            <group position={[0, 4.5, 0.4]}>
                <mesh castShadow>
                    <boxGeometry args={[1, 2.5, 0.6]} />
                    <meshStandardMaterial color="#222222" />
                </mesh>
                {/* Kırmızı */}
                <mesh position={[0, 0.8, 0.31]}>
                    <circleGeometry args={[0.3, 32]} />
                    <meshStandardMaterial
                        color={carLight === "red" ? "#ff0000" : "#330000"}
                        emissive={carLight === "red" ? "#ff0000" : "#000000"}
                        emissiveIntensity={carLight === "red" ? 2 : 0}
                    />
                </mesh>
                {/* Sarı */}
                <mesh position={[0, 0, 0.31]}>
                    <circleGeometry args={[0.3, 32]} />
                    <meshStandardMaterial
                        color={carLight === "yellow" ? "#ffff00" : "#333300"}
                        emissive={carLight === "yellow" ? "#ffff00" : "#000000"}
                        emissiveIntensity={carLight === "yellow" ? 2 : 0}
                    />
                </mesh>
                {/* Yeşil */}
                <mesh position={[0, -0.8, 0.31]}>
                    <circleGeometry args={[0.3, 32]} />
                    <meshStandardMaterial
                        color={carLight === "green" ? "#00ff00" : "#003300"}
                        emissive={carLight === "green" ? "#00ff00" : "#000000"}
                        emissiveIntensity={carLight === "green" ? 2 : 0}
                    />
                </mesh>
            </group>

            {/* Yaya Işığı */}
            <group position={[0.8, 3, 0.3]}>
                <mesh castShadow>
                    <boxGeometry args={[0.6, 1.2, 0.4]} />
                    <meshStandardMaterial color="#222222" />
                </mesh>
                <mesh position={[0, 0.3, 0.21]}>
                    <circleGeometry args={[0.2, 32]} />
                    <meshStandardMaterial
                        color={pedLight === "red" ? "#ff0000" : "#330000"}
                        emissive={pedLight === "red" ? "#ff0000" : "#000000"}
                        emissiveIntensity={pedLight === "red" ? 1.5 : 0}
                    />
                </mesh>
                <mesh position={[0, -0.3, 0.21]}>
                    <circleGeometry args={[0.2, 32]} />
                    <meshStandardMaterial
                        color={pedLight === "green" ? "#00ff00" : "#003300"}
                        emissive={pedLight === "green" ? "#00ff00" : "#000000"}
                        emissiveIntensity={pedLight === "green" ? 1.5 : 0}
                    />
                </mesh>
            </group>
        </group>
    );
}

// ==================== AVATAR ====================
function Avatar({ position, rotationY = 0, category }) {
    const info = CATEGORIES[category];
    const meshRef = useRef();
    const timeRef = useRef(0);

    // Basit yürüme animasyonu (kategoriye göre tempo)
    useFrame((state, delta) => {
        timeRef.current += delta;
        if (meshRef.current) {
            const tempo = Math.max(0.6, info.speed); // hızla orantılı sallanma
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.2 * tempo) * 0.12;
        }
    });

    const getAvatarHeight = () => {
        switch (category) {
            case "child": return 1.0;
            case "elderly": return 1.5;
            case "disabled": return 1.2;
            default: return 1.7;
        }
    };

    const legSwing = (offset = 0, amp = 0.3, speed = 6) => Math.sin(timeRef.current * speed + offset) * amp;
    const bob = Math.sin(timeRef.current * 6) * 0.03;

    return (
        <group position={[position[0], bob, position[2]]} rotation={[0, rotationY, 0]} ref={meshRef}>
            {category === "disabled" ? (
                // Tekerlekli sandalye + kişi
                <>
                    <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[0.9, 0.9, 1]} />
                        <meshStandardMaterial color={info.color} />
                    </mesh>
                    {/* Arka dayama */}
                    <mesh position={[0, 1.05, -0.35]} castShadow>
                        <boxGeometry args={[0.9, 0.7, 0.15]} />
                        <meshStandardMaterial color="#1f2937" />
                    </mesh>
                    {/* Tekerlekler */}
                    {[-0.45, 0.45].map((x, idx) => (
                        <mesh key={idx} position={[x, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.32, 0.32, 0.14, 22]} />
                            <meshStandardMaterial color="#2e2e2e" />
                        </mesh>
                    ))}
                    {/* Kişi */}
                    <mesh position={[0, 1.25, 0]} castShadow>
                        <sphereGeometry args={[0.26, 20, 20]} />
                        <meshStandardMaterial color="#f5d0a0" />
                    </mesh>
                    <mesh position={[0, 0.95, 0]} castShadow>
                        <capsuleGeometry args={[0.24, 0.5, 10, 16]} />
                        <meshStandardMaterial color="#1f2937" />
                    </mesh>
                </>
            ) : (
                // İnsan figürü daha detaylı (kategoriye özel aksesuarlar)
                <>
                    {/* Gövde */}
                    <mesh position={[0, getAvatarHeight() / 2, 0]} castShadow>
                        <capsuleGeometry args={[0.3, getAvatarHeight() - 0.6, 12, 18]} />
                        <meshStandardMaterial color={info.color} />
                    </mesh>
                    {/* Kafa */}
                    <mesh position={[0, getAvatarHeight() + 0.14, 0]} castShadow>
                        <sphereGeometry args={[0.27, 22, 22]} />
                        <meshStandardMaterial color="#f5d0a0" />
                    </mesh>
                    {/* Kollar */}
                    {[-0.38, 0.38].map((x, idx) => (
                        <mesh key={idx} position={[x, getAvatarHeight() / 2, 0]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]} castShadow>
                            <capsuleGeometry args={[0.09, 0.55, 10, 14]} />
                            <meshStandardMaterial color={info.color} />
                        </mesh>
                    ))}
                    {/* Bacaklar (kategori hızına göre salınım) */}
                    {[-0.16, 0.16].map((x, idx) => {
                        const amp = category === "child" ? 0.4 : 0.28;
                        const spd = category === "elderly" ? 4 : 6;
                        return (
                            <mesh key={idx} position={[x, 0.15, 0]} rotation={[legSwing(idx, amp, spd), 0, 0]} castShadow>
                                <capsuleGeometry args={[0.1, 0.65, 10, 14]} />
                                <meshStandardMaterial color="#1f2937" />
                            </mesh>
                        );
                    })}

                    {/* Kategoriye özel aksesuarlar */}
                    {category === "adult" && (
                        <mesh position={[0, getAvatarHeight() * 0.45, -0.22]} rotation={[0, 0, 0]} castShadow>
                            <boxGeometry args={[0.25, 0.4, 0.12]} />
                            <meshStandardMaterial color="#0ea5e9" />
                        </mesh>
                    )}
                    {category === "child" && (
                        <mesh position={[0, getAvatarHeight() + 0.35, 0]} castShadow>
                            <coneGeometry args={[0.28, 0.35, 12]} />
                            <meshStandardMaterial color="#f97316" />
                        </mesh>
                    )}
                    {category === "elderly" && (
                        <>
                            <mesh position={[0.45, 0.4, 0]} castShadow>
                                <cylinderGeometry args={[0.03, 0.03, 1.2]} />
                                <meshStandardMaterial color="#8B4513" />
                            </mesh>
                            <mesh position={[0, getAvatarHeight() + 0.32, 0]} castShadow>
                                <cylinderGeometry args={[0.18, 0.2, 0.14, 12]} />
                                <meshStandardMaterial color="#d4d4d8" />
                            </mesh>
                        </>
                    )}
                </>
            )}

            {/* İsim etiketi */}
            <Text
                position={[0, getAvatarHeight() + 0.7, 0]}
                fontSize={0.4}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="black"
            >
                {info.emoji} {info.name}
            </Text>
        </group>
    );
}

// ==================== AI KAMERA ====================
function AiCamera({ position, lookAt, active = false, label = "AI Kamera" }) {
    const cameraRef = useRef();

    useFrame(() => {
        if (cameraRef.current) {
            cameraRef.current.lookAt(lookAt[0], lookAt[1], lookAt[2]);
        }
    });

    return (
        <group position={position} ref={cameraRef}>
            {/* Kamera gövdesi */}
            <mesh castShadow>
                <boxGeometry args={[1, 0.6, 0.8]} />
                <meshStandardMaterial color={active ? "#0f172a" : "#1a1a1a"} emissive={active ? "#22c55e" : "#000000"} emissiveIntensity={active ? 0.8 : 0} />
            </mesh>
            {/* Lens */}
            <mesh position={[0, 0, 0.5]}>
                <cylinderGeometry args={[0.2, 0.25, 0.3, 16]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color={active ? "#22c55e" : "#333333"} />
            </mesh>
            {/* Kırmızı / Yeşil durum ışığı */}
            <mesh position={[0.3, 0.2, 0.4]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={active ? "#22c55e" : "#ff0000"} emissive={active ? "#22c55e" : "#ff0000"} emissiveIntensity={2} />
            </mesh>
            {/* AI etiketi */}
            <Text position={[0, 0.8, 0]} fontSize={0.3} color={active ? "#22c55e" : "#00ff00"} anchorX="center">
                🤖 {label}
            </Text>
            {/* Direk */}
            <mesh position={[0, -4, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 8]} />
                <meshStandardMaterial color="#666666" />
            </mesh>
        </group>
    );
}
